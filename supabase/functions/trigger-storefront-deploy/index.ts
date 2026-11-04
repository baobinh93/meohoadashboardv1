
import { withSupabase } from "@supabase/server";

const GITHUB_OWNER = "baobinh93";
const GITHUB_REPO = "meohoa-storefront-astro";
const GITHUB_WORKFLOW_ID = "402395134";
const GITHUB_BRANCH = "main";

const GITHUB_API_URL =
  `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${GITHUB_WORKFLOW_ID}/dispatches`;

type DeployRequestResult = {
  success: boolean;
  code?: string;
  message?: string;
  deployment_id?: string;
};

type GitHubDispatchResult = {
  workflow_run_id?: number;
  html_url?: string;
  run_url?: string;
};

export default {
  fetch: withSupabase(
    { auth: "user" },
    async (req, ctx) => {
      if (req.method !== "POST") {
        return Response.json(
          {
            success: false,
            message: "Method not allowed.",
          },
          { status: 405 },
        );
      }

      let deploymentId: string | null = null;

      try {
        // 1. Xác thực người dùng từ JWT
        const {
          data: { user },
          error: userError,
        } = await ctx.supabase.auth.getUser();

        if (userError || !user) {
          return Response.json(
            {
              success: false,
              code: "UNAUTHENTICATED",
              message:
                "Bạn chưa đăng nhập hoặc phiên đăng nhập không hợp lệ.",
            },
            { status: 401 },
          );
        }

        // 2. Kiểm tra profile
        const { data: profile, error: profileError } =
          await ctx.supabase
            .from("profiles")
            .select("id, role, is_active")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
          console.error("Profile query error:", profileError);

          return Response.json(
            {
              success: false,
              message: "Không thể kiểm tra quyền người dùng.",
            },
            { status: 500 },
          );
        }

        if (!profile) {
          return Response.json(
            {
              success: false,
              code: "PROFILE_NOT_FOUND",
              message: "Không tìm thấy hồ sơ người dùng.",
            },
            { status: 403 },
          );
        }

        if (profile.is_active !== true) {
          return Response.json(
            {
              success: false,
              code: "ACCOUNT_DISABLED",
              message: "Tài khoản của bạn đã bị vô hiệu hóa.",
            },
            { status: 403 },
          );
        }

        if (!["admin", "staff"].includes(profile.role)) {
          return Response.json(
            {
              success: false,
              code: "FORBIDDEN",
              message: "Bạn không có quyền cập nhật website.",
            },
            { status: 403 },
          );
        }

        // 3. Kiểm tra GitHub Token
        const githubToken = Deno.env.get("GITHUB_TOKEN");

        if (!githubToken) {
          console.error("Missing GITHUB_TOKEN secret.");

          return Response.json(
            {
              success: false,
              code: "GITHUB_TOKEN_MISSING",
              message: "Hệ thống chưa cấu hình GitHub Token.",
            },
            { status: 500 },
          );
        }

        // 4. Tạo yêu cầu deploy và giữ khóa toàn hệ thống
        const {
          data: requestData,
          error: requestError,
        } = await ctx.supabase.rpc("request_storefront_deploy");

        if (requestError) {
          console.error(
            "Create deployment request error:",
            requestError,
          );

          return Response.json(
            {
              success: false,
              code: "DEPLOY_REQUEST_ERROR",
              message: "Không thể tạo yêu cầu cập nhật website.",
            },
            { status: 500 },
          );
        }

        const requestResult =
          requestData as DeployRequestResult | null;

        if (!requestResult?.success) {
          const code =
            requestResult?.code ?? "DEPLOY_REQUEST_REJECTED";

          const status =
            code === "DEPLOY_ALREADY_ACTIVE"
              ? 409
              : code === "FORBIDDEN" ||
                  code === "UNAUTHENTICATED"
                ? 403
                : 400;

          return Response.json(
            {
              success: false,
              code,
              message:
                requestResult?.message ??
                "Không thể tạo yêu cầu deploy.",
            },
            { status },
          );
        }

        deploymentId = requestResult.deployment_id ?? null;

        if (!deploymentId) {
          console.error("Missing deployment_id from RPC.");

          return Response.json(
            {
              success: false,
              code: "DEPLOYMENT_ID_MISSING",
              message: "Không nhận được mã yêu cầu deploy.",
            },
            { status: 500 },
          );
        }

        // 5. Gọi GitHub Actions
        let githubResponse: Response;

        try {
          githubResponse = await fetch(GITHUB_API_URL, {
            method: "POST",
            headers: {
              Accept: "application/vnd.github+json",
              Authorization: `Bearer ${githubToken}`,
              "X-GitHub-Api-Version": "2026-03-10",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ref: GITHUB_BRANCH,
              return_run_details: true,
            }),
            signal: AbortSignal.timeout(20000),
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown network error";

          console.error(
            "GitHub dispatch network error:",
            errorMessage,
          );

          // Không xác định được GitHub đã nhận request hay chưa.
          // Giữ khóa để tránh tạo deploy trùng.
          await ctx.supabaseAdmin
            .from("storefront_deployments")
            .update({
              error_message:
                "Không xác định được kết quả gửi yêu cầu tới GitHub. Cần kiểm tra GitHub Actions.",
              updated_at: new Date().toISOString(),
            })
            .eq("id", deploymentId)
            .eq("requested_by", user.id)
            .eq("status", "dispatching");

          return Response.json(
            {
              success: false,
              code: "DISPATCH_OUTCOME_UNKNOWN",
              deployment_id: deploymentId,
              message:
                "Chưa xác định được GitHub đã nhận yêu cầu hay chưa. Hệ thống giữ khóa để tránh deploy trùng. Vui lòng kiểm tra GitHub Actions.",
            },
            { status: 502 },
          );
        }

        // 6. Xử lý lỗi GitHub API
        if (!githubResponse.ok) {
          const githubError = await githubResponse.text();

          console.error(
            "GitHub API error:",
            githubResponse.status,
            githubError.slice(0, 1500),
          );

          const errorMessage =
            `GitHub API ${githubResponse.status}: ${githubError.slice(0, 1000)}`;

          if (
            githubResponse.status >= 400 &&
            githubResponse.status < 500
          ) {
            // GitHub từ chối request: giải phóng khóa.
            const { error: updateError } =
              await ctx.supabaseAdmin
                .from("storefront_deployments")
                .update({
                  status: "completed",
                  conclusion: "failure",
                  error_message: errorMessage,
                  completed_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", deploymentId)
                .eq("requested_by", user.id)
                .eq("status", "dispatching");

            if (updateError) {
              console.error(
                "Failed to release deployment lock:",
                updateError,
              );
            }
          } else {
            // Lỗi 5xx: giữ khóa để đối soát.
            await ctx.supabaseAdmin
              .from("storefront_deployments")
              .update({
                error_message:
                  "GitHub API trả về lỗi máy chủ. Cần đối soát trạng thái workflow.",
                updated_at: new Date().toISOString(),
              })
              .eq("id", deploymentId)
              .eq("requested_by", user.id)
              .eq("status", "dispatching");
          }

          return Response.json(
            {
              success: false,
              code:
                githubResponse.status < 500
                  ? "GITHUB_DISPATCH_REJECTED"
                  : "GITHUB_SERVER_ERROR",
              deployment_id: deploymentId,
              message:
                githubResponse.status < 500
                  ? "GitHub từ chối yêu cầu cập nhật website. Hệ thống đã thử giải phóng khóa deploy."
                  : "GitHub đang gặp lỗi máy chủ. Hệ thống giữ khóa để tránh tạo deploy trùng.",
            },
            { status: 502 },
          );
        }

        // 7. Đọc thông tin workflow run
        let githubData: GitHubDispatchResult;

        try {
          githubData = await githubResponse.json();
        } catch (error) {
          console.error("Invalid GitHub response:", error);

          await ctx.supabaseAdmin
            .from("storefront_deployments")
            .update({
              error_message:
                "GitHub có thể đã nhận workflow nhưng không trả về thông tin Run ID.",
              updated_at: new Date().toISOString(),
            })
            .eq("id", deploymentId)
            .eq("requested_by", user.id)
            .eq("status", "dispatching");

          return Response.json(
            {
              success: true,
              tracking_saved: false,
              deployment_id: deploymentId,
              message:
                "GitHub đã phản hồi thành công nhưng chưa lấy được thông tin theo dõi. Không tạo yêu cầu deploy mới.",
            },
            { status: 202 },
          );
        }

        const githubRunId = githubData.workflow_run_id;
        const githubRunUrl = githubData.html_url;

        const expectedRunUrl =
          `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs/${githubRunId}`;

        if (
          typeof githubRunId !== "number" ||
          !Number.isSafeInteger(githubRunId) ||
          githubRunId <= 0 ||
          githubRunUrl !== expectedRunUrl
        ) {
          console.error(
            "Invalid GitHub workflow run details:",
            githubData,
          );

          await ctx.supabaseAdmin
            .from("storefront_deployments")
            .update({
              error_message:
                "GitHub đã nhận yêu cầu nhưng thông tin Run ID không hợp lệ.",
              updated_at: new Date().toISOString(),
            })
            .eq("id", deploymentId)
            .eq("requested_by", user.id)
            .eq("status", "dispatching");

          return Response.json(
            {
              success: true,
              tracking_saved: false,
              deployment_id: deploymentId,
              message:
                "Workflow có thể đã được khởi chạy nhưng chưa lưu được thông tin theo dõi.",
            },
            { status: 202 },
          );
        }

        // 8. Gắn GitHub Run ID vào deployment
        const {
          data: attachData,
          error: attachError,
        } = await ctx.supabase.rpc(
          "attach_storefront_github_run",
          {
            p_deployment_id: deploymentId,
            p_github_run_id: githubRunId,
            p_github_run_url: githubRunUrl,
          },
        );

        if (
          attachError ||
          !(attachData as { success?: boolean } | null)?.success
        ) {
          console.error(
            "Attach GitHub run error:",
            attachError ?? attachData,
          );

          // Workflow đã được tạo: không giải phóng khóa.
          await ctx.supabaseAdmin
            .from("storefront_deployments")
            .update({
              error_message:
                "GitHub đã tạo workflow nhưng chưa lưu được Run ID vào database.",
              updated_at: new Date().toISOString(),
            })
            .eq("id", deploymentId)
            .eq("requested_by", user.id)
            .eq("status", "dispatching");

          return Response.json(
            {
              success: true,
              tracking_saved: false,
              deployment_id: deploymentId,
              github_run_id: githubRunId,
              github_run_url: githubRunUrl,
              message:
                "GitHub đã nhận yêu cầu cập nhật nhưng chưa lưu được thông tin theo dõi vào database.",
            },
            { status: 202 },
          );
        }

        // 9. Thành công
        return Response.json({
          success: true,
          tracking_saved: true,
          deployment_id: deploymentId,
          github_run_id: githubRunId,
          github_run_url: githubRunUrl,
          status: "queued",
          message: "Đã gửi yêu cầu cập nhật website thành công.",
          requested_by: {
            id: profile.id,
            role: profile.role,
          },
        });
      } catch (error) {
        console.error(
          "Trigger storefront deploy error:",
          error,
        );

        return Response.json(
          {
            success: false,
            code: "INTERNAL_ERROR",
            deployment_id: deploymentId,
            message: "Đã xảy ra lỗi trong quá trình xử lý.",
          },
          { status: 500 },
        );
      }
    },
  ),
};

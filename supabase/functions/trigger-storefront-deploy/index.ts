import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

export default {
  fetch: withSupabase(
    { auth: "user" },
    async (req, ctx) => {
      // Chỉ chấp nhận POST
      if (req.method !== "POST") {
        return Response.json(
          {
            success: false,
            message: "Method not allowed",
          },
          { status: 405 },
        );
      }

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
              message: "Bạn chưa đăng nhập hoặc phiên đăng nhập không hợp lệ.",
            },
            { status: 401 },
          );
        }

        // 2. Lấy thông tin profile của người dùng
        const { data: profile, error: profileError } = await ctx.supabase
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

        // 3. Kiểm tra profile
        if (!profile) {
          return Response.json(
            {
              success: false,
              message: "Không tìm thấy hồ sơ người dùng.",
            },
            { status: 403 },
          );
        }

        // 4. Kiểm tra tài khoản có đang hoạt động không
        if (profile.is_active !== true) {
          return Response.json(
            {
              success: false,
              message: "Tài khoản của bạn đã bị vô hiệu hóa.",
            },
            { status: 403 },
          );
        }

        // 5. Chỉ Admin và Staff được phép cập nhật website
        const allowedRoles = ["admin", "staff"];

        if (!allowedRoles.includes(profile.role)) {
          return Response.json(
            {
              success: false,
              message: "Bạn không có quyền cập nhật website.",
            },
            { status: 403 },
          );
        }

        // 6. Xác thực thành công
        return Response.json({
          success: true,
          message: "Xác thực thành công. Bạn có quyền cập nhật website.",
          user: {
            id: profile.id,
            role: profile.role,
          },
        });
      } catch (error) {
        console.error("Trigger storefront deploy error:", error);

        return Response.json(
          {
            success: false,
            message: "Đã xảy ra lỗi trong quá trình xử lý.",
          },
          { status: 500 },
        );
      }
    },
  ),
};
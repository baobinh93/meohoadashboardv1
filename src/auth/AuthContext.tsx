import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getMyProfile, type UserProfile } from "../services/profileService";

// Kiểu dữ liệu được chia sẻ cho toàn bộ ứng dụng
type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;

  // Trạng thái phân quyền
  isAdmin: boolean;
  roleLoading: boolean;

  // Thông tin hồ sơ
  profile: UserProfile | null;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;

  // Các chức năng xác thực
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

// Khởi tạo Auth Context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // 1. Trạng thái đăng nhập
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // 2. Trạng thái phân quyền Admin
  // Lưu kết quả kiểm tra gắn với đúng ID tài khoản
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [adminResult, setAdminResult] = useState(false);
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);

  // Chỉ xác nhận Admin khi kết quả thuộc đúng tài khoản hiện tại
  const isAdmin = Boolean(user && adminUserId === user.id && adminResult);

  const roleLoading = loading || Boolean(user && checkedUserId !== user.id);

  // 3. Trạng thái hồ sơ người dùng
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // 4. Tải lại hồ sơ tài khoản hiện tại
  // Sử dụng sau khi người dùng thay đổi tên hiển thị
  async function refreshProfile() {
    if (!user) {
      setProfile(null);
      return;
    }

    setProfileLoading(true);

    try {
      const data = await getMyProfile();
      setProfile(data);
    } catch (error) {
      console.error("Không tải được hồ sơ:", error);
      setProfile(null);
      throw error;
    } finally {
      setProfileLoading(false);
    }
  }

  // 5. Khôi phục session và theo dõi trạng thái đăng nhập
  useEffect(() => {
    let mounted = true;
    let authEventVersion = 0;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventVersion += 1;

      if (!mounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    const initialVersion = authEventVersion;

    async function restoreSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error("Không đọc được phiên Supabase:", error.message);
        }

        // Không ghi đè sự kiện đăng nhập/đăng xuất mới hơn
        if (authEventVersion === initialVersion) {
          const nextSession = error ? null : data.session;

          setSession(nextSession);
          setUser(nextSession?.user ?? null);
        }
      } catch (error) {
        if (!mounted) return;

        console.error("Lỗi khi khôi phục session:", error);

        if (authEventVersion === initialVersion) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 6. Tự động tải hồ sơ khi tài khoản thay đổi
  useEffect(() => {
    let active = true;

    async function loadProfile() {
      // Chờ xác định xong trạng thái đăng nhập
      if (loading) return;

      // Nếu chưa đăng nhập thì xóa hồ sơ cũ
      if (!user) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);

      try {
        const data = await getMyProfile();

        if (active) {
          setProfile(data);
        }
      } catch (error) {
        console.error("Không tải được hồ sơ:", error);

        if (active) {
          setProfile(null);
        }
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [user, loading]);

  // 7. Kiểm tra quyền Admin qua RPC
  useEffect(() => {
    let active = true;

    async function checkAdmin() {
      // Chờ xác định xong trạng thái đăng nhập
      if (loading) return;

      // Không có user thì không có quyền Admin
      if (!user) {
        setAdminUserId(null);
        setAdminResult(false);
        setCheckedUserId(null);
        return;
      }

      const currentUserId = user.id;

      // Không sử dụng quyền của tài khoản trước
      setAdminUserId(null);
      setAdminResult(false);
      setCheckedUserId(null);

      try {
        const { data, error } = await supabase.rpc("is_admin");

        if (!active) return;

        if (error) {
          console.error("Không kiểm tra được quyền Admin:", error.message);

          setAdminUserId(currentUserId);
          setAdminResult(false);
          setCheckedUserId(currentUserId);
          return;
        }

        setAdminUserId(currentUserId);
        setAdminResult(data === true);
        setCheckedUserId(currentUserId);
      } catch (error) {
        if (!active) return;

        console.error("Lỗi khi kiểm tra quyền Admin:", error);

        setAdminUserId(currentUserId);
        setAdminResult(false);
        setCheckedUserId(currentUserId);
      }
    }

    void checkAdmin();

    return () => {
      active = false;
    };
  }, [user, loading]);

  // 8. Đăng nhập bằng email và mật khẩu
  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  }

  // 9. Đăng xuất
  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;
  }

  // 10. Cung cấp toàn bộ dữ liệu và chức năng cho ứng dụng
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,

        isAdmin,
        roleLoading,

        profile,
        profileLoading,
        refreshProfile,

        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook truy cập Auth Context
export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth phải được dùng bên trong AuthProvider");
  }

  return value;
}

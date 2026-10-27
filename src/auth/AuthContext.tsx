// import { createContext, useContext, useEffect, useState } from "react";
// import type { Session, User } from "@supabase/supabase-js";
// import { supabase } from "../lib/supabase";

// type AuthContextValue = {
//   user: User | null;
//   session: Session | null;
//   loading: boolean;
//   isAdmin: boolean;
//   roleLoading: boolean;
//   signIn: (email: string, password: string) => Promise<void>;
//   signOut: () => Promise<void>;
// };

// const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// export function AuthProvider({ children }: { children: React.ReactNode }) {
//   const [user, setUser] = useState<User | null>(null);
//   const [session, setSession] = useState<Session | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [isAdmin, setIsAdmin] = useState(false);
//   const [roleLoading, setRoleLoading] = useState(true);

//   // 1. Khôi phục session và theo dõi trạng thái đăng nhập
//   useEffect(() => {
//     let mounted = true;

//     supabase.auth.getSession().then(({ data, error }) => {
//       if (!mounted) return;

//       if (error) {
//         console.error("Không đọc được phiên Supabase:", error.message);
//       }

//       setSession(data.session);
//       setUser(data.session?.user ?? null);
//       setLoading(false);
//     });

//     const { data: listener } = supabase.auth.onAuthStateChange(
//       (_event, nextSession) => {
//         setSession(nextSession);
//         setUser(nextSession?.user ?? null);
//         setLoading(false);
//       },
//     );

//     return () => {
//       mounted = false;
//       listener.subscription.unsubscribe();
//     };
//   }, []);

//   // 2. Tự động kiểm tra quyền Admin khi user thay đổi
//   useEffect(() => {
//     let active = true;

//     async function checkAdmin() {
//       // Chờ xác định xong trạng thái đăng nhập
//       if (loading) return;

//       // Không có user thì không có quyền Admin
//       if (!user) {
//         setIsAdmin(false);
//         setRoleLoading(false);
//         return;
//       }

//       // Mặc định không cấp quyền trong lúc kiểm tra
//       setIsAdmin(false);
//       setRoleLoading(true);

//       try {
//         const { data, error } = await supabase.rpc("is_admin");

//         if (!active) return;

//         if (error) {
//           console.error("Không kiểm tra được quyền Admin:", error.message);
//           setIsAdmin(false);
//           return;
//         }

//         setIsAdmin(data === true);
//       } catch (error) {
//         if (!active) return;

//         console.error("Lỗi khi kiểm tra quyền Admin:", error);
//         setIsAdmin(false);
//       } finally {
//         if (active) {
//           setRoleLoading(false);
//         }
//       }
//     }

//     void checkAdmin();

//     return () => {
//       active = false;
//     };
//   }, [user, loading]);

//   // 3. Đăng nhập
//   async function signIn(email: string, password: string) {
//     const { error } = await supabase.auth.signInWithPassword({
//       email,
//       password,
//     });

//     if (error) throw error;
//   }

//   // 4. Đăng xuất
//   async function signOut() {
//     const { error } = await supabase.auth.signOut();

//     if (error) throw error;
//   }

//   // 5. Cung cấp trạng thái cho toàn bộ ứng dụng
//   return (
//     <AuthContext.Provider
//       value={{
//         user,
//         session,
//         loading,
//         isAdmin,
//         roleLoading,
//         signIn,
//         signOut,
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth() {
//   const value = useContext(AuthContext);

//   if (!value) {
//     throw new Error("useAuth phải được dùng bên trong AuthProvider");
//   }

//   return value;
// }

import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  roleLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Lưu kết quả kiểm tra quyền gắn với đúng user
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [adminResult, setAdminResult] = useState(false);
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);

  // Trạng thái quyền được tính theo user hiện tại
  const isAdmin = Boolean(
    user && adminUserId === user.id && adminResult,
  );

  const roleLoading = loading || Boolean(
    user && checkedUserId !== user.id,
  );

  // 1. Khôi phục session và theo dõi đăng nhập
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
          console.error(
            "Không đọc được phiên Supabase:",
            error.message,
          );
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

  // 2. Kiểm tra quyền Admin qua RPC
  useEffect(() => {
    let active = true;

    async function checkAdmin() {
      if (loading) return;

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
          console.error(
            "Không kiểm tra được quyền Admin:",
            error.message,
          );

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

  // 3. Đăng nhập
  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  }

  // 4. Đăng xuất
  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;
  }

  // 5. Cung cấp trạng thái cho toàn bộ ứng dụng
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAdmin,
        roleLoading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error(
      "useAuth phải được dùng bên trong AuthProvider",
    );
  }

  return value;
}

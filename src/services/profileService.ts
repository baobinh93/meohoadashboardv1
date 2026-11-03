import { supabase } from "../lib/supabase";

export interface UserProfile {
  id: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
}

export async function getMyProfile(): Promise<UserProfile> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;

  if (!user) {
    throw new Error("Bạn chưa đăng nhập.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", user.id)
    .single();

  if (error) throw error;

  return data as UserProfile;
}

export async function updateMyProfileName(fullName: string): Promise<string> {
  const { data, error } = await supabase.rpc("update_my_profile_name", {
    p_full_name: fullName,
  });

  if (error) throw error;

  return data as string;
}

export async function updateMyPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}

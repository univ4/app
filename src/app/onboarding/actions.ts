"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, getAuthUser } from "@/lib/supabase/server";

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    redirect("/login");
  }

  const displayName = String(formData.get("display_name") ?? "").trim();
  const schoolName = String(formData.get("school_name") ?? "").trim();
  const targetMajor = String(formData.get("target_major") ?? "").trim();
  const targetUniversities = formData
    .getAll("target_universities")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!displayName || !targetMajor || targetUniversities.length === 0) {
    redirect("/onboarding?error=" + encodeURIComponent("이름·목표 계열·목표 대학을 확인해 주세요."));
  }

  const fullRow = {
    id: user.id,
    name: displayName,
    display_name: displayName,
    school_name: schoolName || null,
    role: "admin" as const,
    target_universities: targetUniversities,
    target_major: targetMajor,
    grade: 3,
  };

  const minimalRow = {
    id: user.id,
    name: displayName,
    role: "admin" as const,
    target_universities: targetUniversities,
    target_major: targetMajor,
  };

  let { error } = await supabase.from("students").insert(fullRow);

  if (
    error &&
    typeof error.message === "string" &&
    error.message.includes("schema cache")
  ) {
    ({ error } = await supabase.from("students").insert(minimalRow));
  }

  if (error) {
    if (error.code === "23505") {
      revalidatePath("/", "layout");
      revalidatePath("/dashboard", "layout");
      redirect("/dashboard");
    }
    redirect(
      "/onboarding?error=" + encodeURIComponent(error.message),
    );
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}

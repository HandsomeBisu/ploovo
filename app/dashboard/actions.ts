"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function createQuizSet(formData: FormData) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login?role=teacher");
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title) {
    redirect("/dashboard/sets/new?error=title");
  }

  const teacher = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!teacher) {
    redirect("/login?role=teacher");
  }

  await prisma.quizSet.create({
    data: {
      title: title.slice(0, 80),
      description: description ? description.slice(0, 180) : null,
      ownerId: teacher.id,
    },
  });

  redirect("/dashboard");
}

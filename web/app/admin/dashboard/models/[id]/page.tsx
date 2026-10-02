"use client";

import { useParams } from "next/navigation";
import ModelEditor from "../ModelEditor";

export default function EditModelPage() {
  const params = useParams();

  const id = typeof params?.id === "string" ? params.id : "";

  // Safety fallback.
  // /models/new must always behave as CREATE.
  if (!id || id === "new") {
    return <ModelEditor mode="create" />;
  }

  return <ModelEditor mode="edit" modelId={id} />;
}

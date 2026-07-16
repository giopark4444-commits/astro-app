import { Suspense } from "react";
import { ChatView } from "./chat-view";

export default function PreguntarPage() {
  return (
    <Suspense fallback={null}>
      <ChatView />
    </Suspense>
  );
}

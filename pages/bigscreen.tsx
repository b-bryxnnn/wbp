import { useEffect } from "react";
import { useRouter } from "next/router";

// Redirect old /bigscreen to /led
export default function BigScreenRedirect() {
  const router = useRouter();
  useEffect(() => {
    void router.replace("/led");
  }, [router]);
  return null;
}

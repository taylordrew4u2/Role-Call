import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";

export async function NavAuth() {
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    // Clerk not configured or middleware unreachable — show sign-in buttons
  }

  if (userId) return <UserButton />;

  return (
    <>
      <SignInButton fallbackRedirectUrl="/dashboard">
        <Button variant="ghost" size="sm">Sign in</Button>
      </SignInButton>
      <SignUpButton fallbackRedirectUrl="/dashboard">
        <Button size="sm">Sign up</Button>
      </SignUpButton>
    </>
  );
}

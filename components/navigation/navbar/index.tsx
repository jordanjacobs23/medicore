import Image from "next/image"
import Link from "next/link"
import Theme from "./Theme"
import { Show } from "@clerk/nextjs"
import { AccountMenu } from "./AccountMenu"

const Navbar = async () => {
  return (
    <nav className="flex background-dark400_light900 fixed z-50 w-full items-center p-6 dark:shadow-none sm:px-12 shadow-light-100">
      <Link href="/" className="flex items-center gap-1">
        <Image 
            src="/images/medicore-logo.png"
            width={28}
            height={28}
            alt="MediCore Logo"
        />
        <p className="h2-bold font-serif text-dark100 dark:text-light-900 max-sm:hidden">
            Medi<span className="text-primary-500">Core</span>
        </p>
      </Link>
      <div className="ml-auto flex items-center gap-2">
      <Show when="signed-out">
        <>
          <Link
            href="/sign-in"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Sign in
          </Link>
          <Theme />
        </>
      </Show>
      <Show when="signed-in">
        <AccountMenu />
      </Show>
      </div>

    </nav>
  )
}

export default Navbar

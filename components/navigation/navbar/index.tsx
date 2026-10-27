import Image from "next/image"
import Link from "next/link"
import Theme from "./Theme"

const Navbar = () => {
  return (
    <nav className="flex-between background-dark400_light900 fixed z-50 w-full p-6 dark:shadow-none sm:px-12 shadow-light-100 gap-5">
      <Link href="/" className="flex items-center gap-1">
        <Image 
            src="/images/medicore-logo.png"
            width={28}
            height={28}
            alt="MediCore Logo"
        />
        <p className="h2-bold font-montserrat text-dark100 dark:text-light-900 max-sm:hidden">
            Medi<span className="text-primary-500">Core</span>
        </p>
      </Link>
      <div className="flex-between gap-5"><Theme /></div>

    </nav>
  )
}

export default Navbar

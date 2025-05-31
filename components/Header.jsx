
import React from 'react'
import {
  UserButton,
  SignedIn,
  SignedOut
} from '@clerk/nextjs'
import { Button } from './ui/button'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, FileText, GraduationCap, LayoutDashboard, PenBox, StarsIcon } from 'lucide-react'
import { checkUser } from '@/lib/checkUser'


const Header = async() => {
  await checkUser()
  return (
    <div className='fixed top-0 left-0 w-full h-16 flex justify-between px-6 p-4 bg-black z-50'>
      <Link href={"/"}>PigeonGuide</Link>
      <div>

        <SignedIn>
          <div className='flex items-center justify-center gap-4'>
            <Link href={"/dashboard"}>
              <Button variant={"outline"}>
                <LayoutDashboard className='w-4 h-4' />
                <span className='hidden md:block'>Industry Insights</span>
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <StarsIcon className='w-4 h-4' />
                  <span className='hidden md:block'>Build Tools</span>
                  <ChevronDown className='w-4 h-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <Link href={"/resume"} className='flex items-center gap-2'>
                    <FileText className='h-4 w-4' />
                    <span>Build Resume</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href={"/ai-cover-latter"} className='flex items-center gap-2'>
                    <PenBox className='h-4 w-4' />
                    <span>Cover Latter</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href={"/interview"} className='flex items-center gap-2'>
                    <GraduationCap className='h-4 w-4' />
                    <span>Interview Preparation</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <UserButton />
          </div>
        </SignedIn>
        
        <SignedOut>
          <Link href={"/sign-in"}>
            <Button
              className={"cursor-pointer"}
              variant={"outline"}
            >
              Sign In
            </Button>
          </Link>
        </SignedOut>
      </div>
    </div>
  )
}

export default Header
import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'

export default function Page() {
    return (
        <div className='w-full min-h-dvh flex justify-center items-center'>
            <div className=''>
                <SignUp />
                <p className='text-center text-muted-foreground mt-4'>
                    Already have an account? <Link href="/sign-in" className='text-primary underline'>Sign In</Link>
                </p>
            </div>
        </div>
    )
}
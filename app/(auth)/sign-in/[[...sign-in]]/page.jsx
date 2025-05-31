import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'

export default function Page() {
    return (
        <div className='w-full min-h-dvh flex justify-center items-center'>
            <div className=''>
                <SignIn />
                <p className='text-center text-muted-foreground mt-4'>
                    Don't have an account? <Link href="/sign-up" className='text-primary underline'>Sign Up</Link>
                </p>
            </div>
        </div>
    )
}
import React from 'react'
import { Button } from './ui/button'
import Link from 'next/link'
import Image from 'next/image'

const HeroSection = () => {
    return (
        <div className='w-full pt-36 md:pt-48 pb-10'>
            <div className='space-y-6 text-center'>
                <div className='mx-auto space-y-6'>
                    <h1 className='gradient-title text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold'>
                        Your AI Career Coach For <br />
                        Professional Success
                    </h1>
                    <p className='mx-auto max-w-[600px] text-muted-foreground md:text-xl'>Advance your career with personalized guidence, interview prep, and AI-Powered tools for Job success</p>
                </div>
                <div>
                    <Link href={"/dashboard"}>
                        <Button size={"lg"} className={"px-8 cursor-pointer"}>Get Started</Button>
                    </Link>
                </div>
                <div className='justify-self-center'>
                    <div>
                        <Image
                            src={"/Banner1.png"}
                            alt='Hero Image'
                            width={900}
                            height={500}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default HeroSection
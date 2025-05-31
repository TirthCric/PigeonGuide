import React, { Suspense } from 'react'
import { BarLoader } from 'react-spinners'

const DashboardLayout = ({children}) => {
  return (
    <div className='px-4'>
        <div className='flex items-center justify-between mb-4'>
            <h1 className='gradient-title text-6xl font-bold leading-normal'>Industry Insights</h1>
        </div>
        <Suspense fallback={<BarLoader className='mt-4' width={"100%"} color='gray'/>}>
            {children}
        </Suspense>
    </div>
  )
}

export default DashboardLayout
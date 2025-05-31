import React, { Suspense } from 'react'
import { BarLoader } from 'react-spinners'

const ResumeLayout = ({children}) => {
  return (
    <div className='px-4'>
        <Suspense fallback={<BarLoader className='mt-4' width={"100%"} color='gray'/>}>
            {children}
        </Suspense>
    </div>
  )
}

export default ResumeLayout
import Header from '@/components/Header'
import React from 'react'

const MainLayout = ({children}) => {
  return (
    <>
    <Header />
    <div className='container mx-auto mt-24 mb-20'>{children}</div>
    </>
  )
}

export default MainLayout
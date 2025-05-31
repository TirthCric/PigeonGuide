import { getUserOnboardingStatus } from '@/actions/user';
import { redirect } from 'next/navigation';
import React from 'react'
import DashboardView from './_components/DashboardView';
import { getIndustryInsights } from '@/actions/dashboard';

const Dashboard = async () => {
   const { isOnboarded } = await getUserOnboardingStatus();
    if(!isOnboarded) {
      redirect('/onboarding');
    }

    const insights = await getIndustryInsights();
  return (
    <div className='container mx-auto'>
      <DashboardView insights={insights} />
    </div>
  )
}

export default Dashboard
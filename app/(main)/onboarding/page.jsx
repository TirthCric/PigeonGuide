import { industries } from '@/data/industries'
import React from 'react'
import OnboardingForm from './_components/OnboardingForm'
import { getUserOnboardingStatus } from '@/actions/user'
import { redirect } from 'next/navigation'

const Onboarding = async () => {
  const { isOnboarded } = await getUserOnboardingStatus();
  if(isOnboarded) {
    redirect('/dashboard');
  }
  return (
    <div>
      <OnboardingForm industries={industries} />
    </div>
  )
}

export default Onboarding
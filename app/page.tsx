'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import PatientHome from '@/components/patient-home';
import AuditLog from '@/components/audit-log';
import UploadDocs from '@/components/upload-docs';
import DoctorPortal from '@/components/doctor-portal';
import PrescriptionEntry from '@/components/prescription-entry';
import PharmacistView from '@/components/pharmacist-view';
import { User, Stethoscope, Pill } from 'lucide-react';

type UserRole = 'patient' | 'doctor' | 'pharmacist';
type Screen =
  | 'home'
  | 'share'
  | 'audit'
  | 'upload'
  | 'doctor-portal'
  | 'prescription'
  | 'pharmacist';

export default function HealthApp() {
  const [userRole, setUserRole] = useState<UserRole>('patient');
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [sharedData, setSharedData] = useState<any>(null);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <PatientHome onNavigate={setCurrentScreen} />;
      case 'audit':
        return <AuditLog onBack={() => setCurrentScreen('home')} />;
      case 'upload':
        return (
          <UploadDocs
            onBack={() => setCurrentScreen('home')}
            onDataUploaded={setSharedData}
          />
        );
      case 'doctor-portal':
        return (
          <DoctorPortal onNavigate={setCurrentScreen} sharedData={sharedData} />
        );
      case 'prescription':
        return (
          <PrescriptionEntry onBack={() => setCurrentScreen('doctor-portal')} />
        );
      case 'pharmacist':
        return <PharmacistView onBack={() => setCurrentScreen('home')} />;
      default:
        return <PatientHome onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Role Switcher */}
      <div className='bg-white p-4'>
        <div className='flex gap-2 justify-center max-w-md mx-auto'>
          <Button
            variant={userRole === 'patient' ? 'default' : 'outline'}
            size='sm'
            onClick={() => {
              setUserRole('patient');
              setCurrentScreen('home');
            }}
            className={`flex items-center gap-2 rounded-full px-4 ${
              userRole === 'patient'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <User className='w-4 h-4' />
            Patient
          </Button>
          <Button
            variant={userRole === 'doctor' ? 'default' : 'outline'}
            size='sm'
            onClick={() => {
              setUserRole('doctor');
              setCurrentScreen('doctor-portal');
            }}
            className={`flex items-center gap-2 rounded-full px-4 ${
              userRole === 'doctor'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Stethoscope className='w-4 h-4' />
            Doctor
          </Button>
          <Button
            variant={userRole === 'pharmacist' ? 'default' : 'outline'}
            size='sm'
            onClick={() => {
              setUserRole('pharmacist');
              setCurrentScreen('pharmacist');
            }}
            className={`flex items-center gap-2 rounded-full px-4 ${
              userRole === 'pharmacist'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Pill className='w-4 h-4' />
            Pharmacist
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className='max-w-md mx-auto'>{renderScreen()}</div>
    </div>
  );
}

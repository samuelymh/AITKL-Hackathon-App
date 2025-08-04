'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Clock, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useRouter, useParams } from 'next/navigation';

export default function SharePage() {
  const router = useRouter();
  const params = useParams();
  const digitalIdentifier = params.digitalIdentifier as string;

  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const [isActive, setIsActive] = useState(true);
  const [qrCodeValue, setQrCodeValue] = useState<string>('');
  const [isLoadingQr, setIsLoadingQr] = useState(false);

  // Stubbed fetch function to get QR code from backend
  const fetchQrCode = async () => {
    console.log('Digital Identifier:', digitalIdentifier);
    setIsLoadingQr(true);
    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Stubbed response - in real app this would be an actual API call
      const response = await fetch('/api/qr-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          digitalIdentifier: digitalIdentifier,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      const data = await response.json();
      setQrCodeValue(data.token);
    } catch (error) {
      console.error('Error fetching QR code:', error);
    } finally {
      setIsLoadingQr(false);
    }
  };

  // Combined useEffect: fetch QR code and start timer only after QR code is loaded
  useEffect(() => {
    const initializeQrAndTimer = async () => {
      await fetchQrCode();

      // Only start the timer after QR code is successfully loaded
      if (qrCodeValue && isActive) {
        const interval = setInterval(() => {
          setTimeLeft((time) => {
            if (time <= 1) {
              setIsActive(false);
              return 0;
            }
            return time - 1;
          });
        }, 1000);

        return () => clearInterval(interval);
      }
    };

    initializeQrAndTimer();
  }, []); // Only run on mount

  // Separate useEffect for timer management after QR code is loaded
  useEffect(() => {
    if (!isActive || timeLeft <= 0 || !qrCodeValue || isLoadingQr) return;

    const interval = setInterval(() => {
      setTimeLeft((time) => {
        if (time <= 1) {
          setIsActive(false);
          return 0;
        }
        return time - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft, qrCodeValue, isLoadingQr]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const handleRevoke = () => {
    setIsActive(false);
    setTimeLeft(0);
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-md mx-auto'>
        <div className='p-4 space-y-4'>
          {/* Header */}
          <div className='flex items-center gap-3'>
            <Button variant='ghost' size='icon' onClick={handleBack}>
              <ArrowLeft className='w-5 h-5' />
            </Button>
            <h1 className='text-xl font-semibold'>Share Medical Records</h1>
          </div>

          {/* QR Code Section */}
          <Card className='text-center'>
            <CardHeader>
              <CardTitle className='flex items-center justify-center gap-2'>
                <Shield className='w-5 h-5 text-green-600' />
                Secure Access Code
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='h-80 flex flex-col justify-center'>
                {isActive ? (
                  <>
                    {/* Large QR Code Placeholder */}
                    <div className='mx-auto w-64 h-64 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center'>
                      {isLoadingQr ? (
                        <div className='flex flex-col items-center gap-2'>
                          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
                          <span className='text-sm text-gray-500'>
                            Generating QR Code...
                          </span>
                        </div>
                      ) : qrCodeValue ? (
                        <QRCodeSVG value={qrCodeValue} size={200} />
                      ) : (
                        <div className='text-center text-gray-500'>
                          <span className='text-sm'>
                            Failed to load QR code
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Countdown Timer */}
                    <div className='space-y-2 mt-4'>
                      <div className='flex items-center justify-center gap-2'>
                        <Clock className='w-4 h-4 text-orange-600' />
                        <span className='text-sm text-gray-600'>
                          Expires in
                        </span>
                      </div>
                      <div className='text-3xl font-mono font-bold text-orange-600'>
                        {formatTime(timeLeft)}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className='space-y-4 text-center'>
                    <X className='w-16 h-16 mx-auto text-gray-400' />
                    <div className='text-lg font-semibold text-gray-600'>
                      Access Expired
                    </div>
                    <p className='text-sm text-gray-500'>
                      Generate a new QR code to share your records
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className='space-y-3'>
            {isActive ? (
              <Button
                onClick={handleRevoke}
                variant='destructive'
                className='w-full'
              >
                Revoke Access
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setTimeLeft(30 * 60);
                  setIsActive(true);
                  fetchQrCode();
                }}
                className='w-full bg-blue-600 hover:bg-blue-700'
              >
                Generate New QR Code
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { CheckCircle, AlertTriangle } from "lucide-react";

interface ProfileStatusIconProps {
  isComplete: boolean;
  className?: string;
}

export function ProfileStatusIcon({
  isComplete,
  className = "h-5 w-5",
}: Readonly<ProfileStatusIconProps>) {
  if (isComplete) {
    return <CheckCircle className={`${className} text-green-600`} />;
  }

  return <AlertTriangle className={`${className} text-orange-600`} />;
}

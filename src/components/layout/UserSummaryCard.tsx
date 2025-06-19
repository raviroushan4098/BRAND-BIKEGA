
"use client";

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon, Briefcase, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const UserSummaryCard = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  
  const lastLoginDate = user.lastLogin ? new Date(user.lastLogin) : new Date();

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">User Profile</CardTitle>
        <UserIcon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(user.name)}`} alt={user.name} data-ai-hint="profile avatar" />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center text-sm">
          <Briefcase className="mr-2 h-4 w-4 text-primary" />
          Role: <span className="ml-1 font-medium capitalize">{user.role}</span>
        </div>
        <div className="flex items-center text-sm">
          <Clock className="mr-2 h-4 w-4 text-accent" />
          Last Login: <span className="ml-1 font-medium">
            {formatDistanceToNow(lastLoginDate, { addSuffix: true })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserSummaryCard;

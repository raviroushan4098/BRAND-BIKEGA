
"use client";

import type { User } from '@/lib/authService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Edit3, Trash2 } from 'lucide-react';

interface UserTableProps {
  users: User[];
  onEditUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
}

const UserTable: React.FC<UserTableProps> = ({ users, onEditUser, onDeleteUser }) => {
  
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Tracked Channels</TableHead>
          <TableHead>Last Login</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(user.name)}`} alt={user.name} data-ai-hint="profile avatar"/>
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                {user.role}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="text-xs">
                {user.trackedChannels?.youtube && user.trackedChannels.youtube.length > 0 && (
                  <div>YT: {user.trackedChannels.youtube.join(', ')}</div>
                )}
                {user.trackedChannels?.instagram && user.trackedChannels.instagram.length > 0 && (
                  <div>IG: {user.trackedChannels.instagram.join(', ')}</div>
                )}
                {(!user.trackedChannels || 
                  (!user.trackedChannels.youtube?.length && !user.trackedChannels.instagram?.length)
                ) && <span className="text-muted-foreground">None</span>}
              </div>
            </TableCell>
            <TableCell>{format(new Date(user.lastLogin), 'MMM d, yyyy HH:mm')}</TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="icon" onClick={() => onEditUser(user)} aria-label="Edit user">
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDeleteUser(user.id)} className="text-destructive hover:text-destructive" aria-label="Delete user">
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default UserTable;

// Mock user type, expand as needed
export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  name: string;
  lastLogin: string; // ISO string
  trackedChannels?: { youtube?: string[]; instagram?: string[] };
}

const MOCK_USERS: User[] = [
  { id: '1', email: 'admin@example.com', role: 'admin', name: 'Admin User', lastLogin: new Date().toISOString(), trackedChannels: { youtube: ['UC-lHJZR3Gqxm24_Vd_AJ5Yw'], instagram: ['instagram'] } },
  { id: '2', email: 'user@example.com', role: 'user', name: 'Regular User', lastLogin: new Date().toISOString(), trackedChannels: { youtube: ['UC-lHJZR3Gqxm24_Vd_AJ5Yw'] } },
];

const USER_STORAGE_KEY = 'insightStreamUser';

// Simulates sending an OTP. In a real app, this would call a backend service.
export const requestOtp = async (email: string): Promise<boolean> => {
  console.log(`OTP requested for ${email}`);
  // Simulate a delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  const userExists = MOCK_USERS.some(u => u.email === email);
  if (!userExists && email !== 'new@example.com') { // Allow 'new@example.com' for creating new user via admin for demo
      console.warn("User not found for OTP request, except for new@example.com for admin demo");
  }
  // For demo purposes, always return true as if OTP was sent
  return true; 
};

// Simulates verifying an OTP.
export const verifyOtp = async (email: string, otp: string): Promise<User | null> => {
  console.log(`OTP verification for ${email} with OTP ${otp}`);
  // Simulate a delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // For demo purposes, any 6-digit OTP is considered valid.
  if (otp === '123456') {
    let user = MOCK_USERS.find(u => u.email === email);
    if (user) {
      user = { ...user, lastLogin: new Date().toISOString() };
      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      }
      return user;
    }
  }
  return null;
};

export const getCurrentUser = (): User | null => {
  if (typeof window !== 'undefined') {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      try {
        return JSON.parse(storedUser) as User;
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        localStorage.removeItem(USER_STORAGE_KEY);
        return null;
      }
    }
  }
  return null;
};

export const logout = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
  console.log('User logged out');
};

// Admin functions (mocked)
export const getAllUsers = (): User[] => {
  // In a real app, this would fetch from a backend.
  // For now, we retrieve from localStorage if available, or use MOCK_USERS.
  // This part is tricky with localStorage as it's per-user.
  // For simplicity, just return MOCK_USERS.
  return MOCK_USERS;
};

export const createUser = (userData: Omit<User, 'id' | 'lastLogin'>): User => {
  const newUser: User = {
    ...userData,
    id: String(MOCK_USERS.length + 1),
    lastLogin: new Date().toISOString(),
  };
  MOCK_USERS.push(newUser); // This only updates the in-memory array for demo
  console.log('Created new user (mock):', newUser);
  return newUser;
};

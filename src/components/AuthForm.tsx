// src/components/AuthForm.tsx
"use client";

import { useState } from "react";
import Image from 'next/image'; // Import Image
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserData { // Define type for user data passed on login success
  fullName?: string;
  gradeLevel?: string;
  phoneNumber?: string;
  // Add other fields returned by login API if needed
}

interface AuthFormProps {
  // **MODIFICATION: Expect user data on successful login**
  setIsLoggedIn: (userData: UserData) => void;
}

const availableGrades = ["9", "10", "11", "12"];

const AuthForm: React.FC<AuthFormProps> = ({ setIsLoggedIn }) => {
  // Login State
  const [loginPhoneNumber, setLoginPhoneNumber] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Registration State
  const [registerPhoneNumber, setRegisterPhoneNumber] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerFullName, setRegisterFullName] = useState("");
  const [registerGradeLevel, setRegisterGradeLevel] = useState<string>("");
  const [isRegistering, setIsRegistering] = useState(false);

  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    if (!loginPhoneNumber || !loginPassword) { toast({ title: "Error", description: "Phone number and password required.", variant: "destructive" }); setIsLoggingIn(false); return; }
    try {
        const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber: loginPhoneNumber, password: loginPassword }), });
        const data = await response.json();
        if (response.ok && data.success) {
            toast({ title: "Success", description: "Login successful!" });
            // **MODIFICATION: Pass user data back**
            setIsLoggedIn(data.user || {}); // Pass user data or empty object
        } else { throw new Error(data.message || "Login failed. Please check your credentials."); }
    } catch (error: any) { console.error('Login error:', error); toast({ title: "Login Error", description: error.message || "An unknown error occurred.", variant: "destructive" });
    } finally { setIsLoggingIn(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    if (!registerPhoneNumber || !registerPassword || !registerFullName || !registerGradeLevel) { toast({ title: "Error", description: "All fields are required for registration.", variant: "destructive" }); setIsRegistering(false); return; }
    const trimmedPhoneNumber = registerPhoneNumber.trim(); const trimmedFullName = registerFullName.trim();
    if (registerPassword.length < 6) { toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" }); setIsRegistering(false); return; }
    if (!/^(09|07)\d{8}$/.test(trimmedPhoneNumber)) { toast({ title: "Error", description: "Use phone format 09... or 07... (10 digits).", variant: "destructive" }); setIsRegistering(false); return; }
    if (trimmedFullName.length < 3) { toast({ title: "Error", description: "Full name must be at least 3 characters.", variant: "destructive" }); setIsRegistering(false); return; }

    try {
        const response = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber: trimmedPhoneNumber, password: registerPassword, fullName: trimmedFullName, gradeLevel: registerGradeLevel }), });
        const data = await response.json();
        if (response.ok && data.success) {
            toast({ title: "Registration Successful", description: data.message || "Account created and logged in." });
             // **MODIFICATION: Create user object and pass back**
             const newUser = {
                 phoneNumber: trimmedPhoneNumber,
                 fullName: trimmedFullName,
                 gradeLevel: registerGradeLevel
             };
             setIsLoggedIn(newUser); // Log in directly
        } else { throw new Error(data.message || "Registration failed."); }
    } catch (error: any) { console.error('Registration error:', error); toast({ title: "Registration Error", description: error.message || "An unknown error occurred.", variant: "destructive" });
    } finally { setIsRegistering(false); }
  };

  return (
    // Center the entire auth section vertically and horizontally
    <div className="container mx-auto p-4 flex flex-col justify-center items-center min-h-screen">
        {/* Logo Above Card */}
        <div className="mb-6">
             <Image
              src="/logo.png"
              alt="Application Logo"
              width={80} // Slightly larger logo on auth page
              height={80}
              priority
            />
        </div>

      <Card className="w-full max-w-md md:max-w-lg shadow-xl border"> {/* Added border */}
        <CardHeader className="p-6 md:p-8 text-center">
          <CardTitle className="text-2xl md:text-3xl font-semibold">Welcome Back!</CardTitle>
           {/* Introduction Text */}
           <p className="text-muted-foreground text-sm pt-2">
               Your AI-powered study assistant. Login or register to generate notes and practice questions instantly.
           </p>
        </CardHeader>
        <CardContent className="p-6 md:p-8 pt-4"> {/* Reduced top padding slightly */}
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            {/* Login Form */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="grid gap-4">
                 <div><Label htmlFor="login-phone">Phone Number</Label><Input type="tel" id="login-phone" value={loginPhoneNumber} onChange={(e) => setLoginPhoneNumber(e.target.value)} placeholder="e.g., 0912345678" required disabled={isLoggingIn}/></div>
                 <div><Label htmlFor="login-password">Password</Label><Input type="password" id="login-password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Enter your password" required disabled={isLoggingIn}/></div>
                 <Button type="submit" disabled={isLoggingIn} className="mt-2 w-full">{isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Login</Button> {/* Full width button */}
              </form>
            </TabsContent>
            {/* Register Form */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="grid gap-4"> {/* Reduced gap slightly */}
                 <div><Label htmlFor="register-fullname">Full Name</Label><Input type="text" id="register-fullname" value={registerFullName} onChange={(e) => setRegisterFullName(e.target.value)} placeholder="Enter your full name" required disabled={isRegistering}/></div>
                 <div><Label htmlFor="register-grade">Grade Level</Label><Select value={registerGradeLevel} onValueChange={setRegisterGradeLevel} required disabled={isRegistering}><SelectTrigger id="register-grade"><SelectValue placeholder="Select your grade" /></SelectTrigger><SelectContent>{availableGrades.map((grade) => ( <SelectItem key={grade} value={grade}>Grade {grade}</SelectItem> ))}</SelectContent></Select></div>
                 <div><Label htmlFor="register-phone">Phone Number</Label><Input type="tel" id="register-phone" value={registerPhoneNumber} onChange={(e) => setRegisterPhoneNumber(e.target.value)} placeholder="e.g., 0912345678 or 0712345678" required disabled={isRegistering}/><p className="text-xs text-muted-foreground mt-1">Enter your 10-digit phone number.</p></div>
                 <div><Label htmlFor="register-password">Password</Label><Input type="password" id="register-password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} placeholder="Create a password (min 6 characters)" required minLength={6} disabled={isRegistering}/></div>
                 <Button type="submit" disabled={isRegistering} className="mt-2 w-full">{isRegistering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Register</Button> {/* Full width button */}
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;

// src/components/AuthForm.tsx
"use client";

import { useState } from "react";
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface UserData { /* ... */ }
interface AuthFormProps { setIsLoggedIn: (userData: UserData) => void; }
const availableGrades = ["9", "10", "11", "12"];

type FormErrors = {
    loginPhone?: string;
    loginPassword?: string;
    registerPhone?: string;
    registerPassword?: string;
    registerFullName?: string;
    registerGrade?: string;
    // Using a single general error key for simplicity, distinguish in message
    apiError?: string;
};

const AuthForm: React.FC<AuthFormProps> = ({ setIsLoggedIn }) => {
  const [loginPhoneNumber, setLoginPhoneNumber] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [registerPhoneNumber, setRegisterPhoneNumber] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerFullName, setRegisterFullName] = useState("");
  const [registerGradeLevel, setRegisterGradeLevel] = useState<string>("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const { toast } = useToast();

  const clearSpecificErrors = (fields: Array<keyof FormErrors>) => {
      setErrors(prev => {
          const next = {...prev};
          fields.forEach(field => delete next[field]);
          delete next.apiError; // Also clear general API error when a field changes
          return next;
      });
  };

  const validateLogin = (): boolean => { /* ... keep, sets loginPhone/loginPassword in errors ... */ }
  const validateRegistration = (): boolean => { /* ... keep, sets registerPhone/etc. in errors ... */ }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({}); // Clear all previous errors on new submission attempt
    if (!validateLogin()) return;

    setIsLoggingIn(true);
    try {
        const response = await fetch('/api/login', { /* ... */ });
        const data = await response.json();
        if (response.ok && data.success) {
            toast({ title: "Success", description: "Login successful!" });
            setIsLoggedIn(data.user || {});
        } else {
            // **MODIFICATION: Set apiError for inline display from API**
            setErrors({ apiError: data.message || "Invalid phone number or password." });
            console.error('Login API Error:', data.message);
        }
    } catch (error: any) {
        console.error('Login Fetch Error:', error);
        // **MODIFICATION: Set apiError for inline display from fetch error**
        setErrors({ apiError: "Login failed. Check connection or try again." });
    } finally {
        setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({}); // Clear all previous errors on new submission attempt
    if (!validateRegistration()) return;

    setIsRegistering(true);
    const trimmedPhoneNumber = registerPhoneNumber.trim();
    const trimmedFullName = registerFullName.trim();

    try {
        const response = await fetch('/api/register', { /* ... */ });
        const data = await response.json();
        if (response.ok && data.success) {
            toast({ title: "Registration Successful", description: data.message });
            setIsLoggedIn(data.user || { phoneNumber: trimmedPhoneNumber, fullName: trimmedFullName, gradeLevel: registerGradeLevel });
        } else {
            // **MODIFICATION: Set apiError or specific registerPhone error INLINE**
            if (response.status === 409) { // Phone number already registered
                setErrors({ registerPhone: data.message || "Phone number already taken.", apiError: data.message || "Phone number already taken." }); // Set both for field specific and general
            } else {
                 setErrors({ apiError: data.message || "Registration failed. Please check details." });
            }
            console.error('Registration API Error:', data.message);
        }
    } catch (error: any) {
      console.error('Registration Fetch Error:', error);
      // **MODIFICATION: Set apiError for inline display from fetch error**
      setErrors({ apiError: "Registration failed. Check connection or try again." });
    } finally {
       setIsRegistering(false);
    }
  };

  const getInputClass = (fieldError?: boolean, apiError?: boolean) => {
    return cn("border-input", (fieldError || apiError) && "border-destructive focus-visible:ring-destructive");
  };

  return (
    <div className="container mx-auto p-4 flex flex-col justify-center items-center min-h-screen">
      {/* ... Logo ... */}
      <Card className="w-full max-w-md md:max-w-lg shadow-xl border">
        {/* ... CardHeader ... */}
        <CardContent className="p-6 md:p-8 pt-4">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {/* ----- Login Form ----- */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="grid gap-4">
                {/* **MODIFICATION: Display API Error for Login Form** */}
                {errors.apiError && (
                     <div className="bg-destructive/10 border border-destructive/50 text-destructive text-xs rounded-md p-2.5 text-center flex items-center justify-center gap-1">
                         <AlertCircle className="h-4 w-4 shrink-0"/>{errors.apiError}
                     </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="login-phone">Phone Number</Label>
                  <Input
                    type="tel" id="login-phone" value={loginPhoneNumber}
                    onChange={(e) => { setLoginPhoneNumber(e.target.value); clearSpecificErrors(['loginPhone', 'loginPassword']); }}
                    placeholder="e.g., 0912345678" required disabled={isLoggingIn}
                    className={cn(getInputClass(!!errors.loginPhone, !!errors.apiError))}
                    aria-invalid={!!errors.loginPhone || !!errors.apiError}
                  />
                  {errors.loginPhone && <p className="text-xs text-destructive flex items-center gap-1 pt-1"><AlertCircle className="h-3.5 w-3.5 shrink-0"/>{errors.loginPhone}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    type="password" id="login-password" value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value); clearSpecificErrors(['loginPhone', 'loginPassword']); }}
                    placeholder="Enter your password" required disabled={isLoggingIn}
                    className={cn(getInputClass(!!errors.loginPassword, !!errors.apiError))}
                    aria-invalid={!!errors.loginPassword || !!errors.apiError}
                  />
                   {errors.loginPassword && <p className="text-xs text-destructive flex items-center gap-1 pt-1"><AlertCircle className="h-3.5 w-3.5 shrink-0"/>{errors.loginPassword}</p>}
                </div>
                <Button type="submit" disabled={isLoggingIn} className="mt-2 w-full">
                    {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Login
                </Button>
              </form>
            </TabsContent>

            {/* ----- Register Form ----- */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="grid gap-4">
                 {/* **MODIFICATION: Display API Error for Register Form (unless it's a phone error)** */}
                 {errors.apiError && !errors.registerPhone && ( // Only show general API error if not specific phone error
                     <div className="bg-destructive/10 border border-destructive/50 text-destructive text-xs rounded-md p-2.5 text-center flex items-center justify-center gap-1">
                         <AlertCircle className="h-4 w-4 shrink-0"/>{errors.apiError}
                     </div>
                 )}
                 <div className="space-y-1.5">
                    <Label htmlFor="register-fullname">Full Name</Label>
                    <Input type="text" id="register-fullname" value={registerFullName} onChange={(e) => { setRegisterFullName(e.target.value); clearSpecificErrors(['registerFullName', 'registerGrade', 'registerPhone', 'registerPassword']); }} placeholder="Enter your full name" required disabled={isRegistering} className={cn(getInputClass(!!errors.registerFullName))} aria-invalid={!!errors.registerFullName} />
                    {errors.registerFullName && <p className="text-xs text-destructive flex items-center gap-1 pt-1"><AlertCircle className="h-3.5 w-3.5 shrink-0"/>{errors.registerFullName}</p>}
                 </div>
                 <div className="space-y-1.5">
                    <Label htmlFor="register-grade">Grade Level</Label>
                    <Select value={registerGradeLevel} onValueChange={(value) => { setRegisterGradeLevel(value); clearSpecificErrors(['registerFullName', 'registerGrade', 'registerPhone', 'registerPassword']); }} required disabled={isRegistering} >
                        <SelectTrigger id="register-grade" className={cn("h-10 md:h-9", getInputClass(!!errors.registerGrade))} aria-invalid={!!errors.registerGrade}><SelectValue placeholder="Select your grade" /></SelectTrigger>
                        <SelectContent>{availableGrades.map((grade) => ( <SelectItem key={grade} value={grade}>Grade {grade}</SelectItem> ))}</SelectContent>
                    </Select>
                    {errors.registerGrade && <p className="text-xs text-destructive flex items-center gap-1 pt-1"><AlertCircle className="h-3.5 w-3.5 shrink-0"/>{errors.registerGrade}</p>}
                 </div>
                 <div className="space-y-1.5">
                    <Label htmlFor="register-phone">Phone Number</Label>
                    <Input type="tel" id="register-phone" value={registerPhoneNumber} onChange={(e) => { setRegisterPhoneNumber(e.target.value); clearSpecificErrors(['registerFullName', 'registerGrade', 'registerPhone', 'registerPassword']); }} placeholder="e.g., 0912345678" required disabled={isRegistering} className={cn(getInputClass(!!errors.registerPhone, !!errors.apiError && !!errors.registerPhone))} aria-invalid={!!errors.registerPhone}/>
                    {errors.registerPhone ? ( <p className="text-xs text-destructive flex items-center gap-1 pt-1"><AlertCircle className="h-3.5 w-3.5 shrink-0"/>{errors.registerPhone}</p> ) : ( <p className="text-xs text-muted-foreground pt-1">Enter 10 digits (09... or 07...).</p> )}
                 </div>
                 <div className="space-y-1.5">
                    <Label htmlFor="register-password">Password</Label>
                    <Input type="password" id="register-password" value={registerPassword} onChange={(e) => { setRegisterPassword(e.target.value); clearSpecificErrors(['registerFullName', 'registerGrade', 'registerPhone', 'registerPassword']); }} placeholder="Create a password (min 6 characters)" required minLength={6} disabled={isRegistering} className={cn(getInputClass(!!errors.registerPassword))} aria-invalid={!!errors.registerPassword}/>
                    {errors.registerPassword && <p className="text-xs text-destructive flex items-center gap-1 pt-1"><AlertCircle className="h-3.5 w-3.5 shrink-0"/>{errors.registerPassword}</p>}
                 </div>
                 <Button type="submit" disabled={isRegistering} className="mt-2 w-full">
                  {isRegistering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Register
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;

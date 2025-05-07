// src/components/AuthForm.tsx
"use client";

import { useState } from "react";
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast"; // Keep for SUCCESS messages
import { Loader2, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface UserData {
  fullName?: string;
  gradeLevel?: string;
  phoneNumber?: string;
}

interface AuthFormProps {
  setIsLoggedIn: (userData: UserData) => void;
}

const availableGrades = ["9", "10", "11", "12"];

// Type for ALL errors (client & server, specific to each form)
type FormErrors = {
    loginPhone?: string;
    loginPassword?: string;
    generalLogin?: string; // For API/general errors on Login form

    registerPhone?: string;
    registerPassword?: string;
    registerFullName?: string;
    registerGrade?: string;
    generalRegister?: string;  // For API/general errors on Register form
};

const AuthForm: React.FC<AuthFormProps> = ({ setIsLoggedIn }) => {
  // --- State ---
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

  // --- Client-Side Validation Logic ---
  const validateLogin = (): boolean => {
      let currentErrors: FormErrors = {};
      if (!loginPhoneNumber.trim()) currentErrors.loginPhone = "Phone number is required.";
      if (!loginPassword) currentErrors.loginPassword = "Password is required.";
      setErrors(currentErrors);
      return Object.keys(currentErrors).length === 0;
  }

  const validateRegistration = (): boolean => {
      let currentErrors: FormErrors = {};
      const trimmedPhoneNumber = registerPhoneNumber.trim();
      const trimmedFullName = registerFullName.trim();

      if (!trimmedPhoneNumber) currentErrors.registerPhone = "Phone number is required.";
      else if (!/^(09|07)\d{8}$/.test(trimmedPhoneNumber)) currentErrors.registerPhone = "Invalid phone format (10 digits, 09.../07...).";
      if (!registerPassword) currentErrors.registerPassword = "Password is required.";
      else if (registerPassword.length < 6) currentErrors.registerPassword = "Password must be at least 6 characters.";
      if (!trimmedFullName) currentErrors.registerFullName = "Full name is required.";
      else if (trimmedFullName.length < 3) currentErrors.registerFullName = "Full name must be at least 3 characters.";
      if (!registerGradeLevel) currentErrors.registerGrade = "Grade level is required.";

      setErrors(currentErrors);
      return Object.keys(currentErrors).length === 0;
  }

  // --- Submit Handlers ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({}); // Clear ALL previous errors on new submission
    if (!validateLogin()) return; // Perform client validation first

    setIsLoggingIn(true);
    try {
        const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber: loginPhoneNumber.trim(), password: loginPassword }), });
        const data = await response.json();

        if (response.ok && data.success) {
            toast({ title: "Success", description: "Login successful!" });
            setIsLoggedIn(data.user || {});
        } else {
            // API error: Set generalLogin error INLINE
            setErrors({ generalLogin: data.message || "Invalid phone number or password." });
            console.error('Login API Error:', data.message);
        }
    } catch (error: any) {
        console.error('Login Fetch Error:', error);
        // Fetch error: Set generalLogin error INLINE
        setErrors({ generalLogin: "Login failed. Check connection or try again." });
    } finally {
        setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({}); // Clear ALL previous errors on new submission
    if (!validateRegistration()) return; // Perform client validation first

    setIsRegistering(true);
    const trimmedPhoneNumber = registerPhoneNumber.trim();
    const trimmedFullName = registerFullName.trim();

    try {
        const response = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber: trimmedPhoneNumber, password: registerPassword, fullName: trimmedFullName, gradeLevel: registerGradeLevel }), });
        const data = await response.json();

        if (response.ok && data.success) {
            toast({ title: "Registration Successful", description: data.message || "Account created and logged in." });
             const newUser = { phoneNumber: trimmedPhoneNumber, fullName: trimmedFullName, gradeLevel: registerGradeLevel };
             setIsLoggedIn(newUser);
        } else {
            // API error: Set specific field error or generalRegister error INLINE
            if (response.status === 409) { // Phone number already registered
                setErrors({ registerPhone: data.message || "Phone number already taken." });
            } else {
                 setErrors({ generalRegister: data.message || "Registration failed. Please check details." });
            }
            console.error('Registration API Error:', data.message);
        }
    } catch (error: any) {
      console.error('Registration Fetch Error:', error);
      // Fetch error: Set generalRegister error INLINE
      setErrors({ generalRegister: "Registration failed. Check connection or try again." });
    } finally {
       setIsRegistering(false);
    }
  };

  // Helper to get input border classes based on error
  const getInputClass = (hasError?: boolean) => {
    return cn("border-input", hasError && "border-destructive focus-visible:ring-destructive");
  };

  return (
    <div className="container mx-auto p-4 flex flex-col justify-center items-center min-h-screen">
      <div className="mb-6"> <Image src="/logo.png" alt="App Logo" width={80} height={80} priority /> </div>
      <Card className="w-full max-w-md md:max-w-lg shadow-xl border">
        <CardHeader className="p-6 md:p-8 text-center">
          <CardTitle className="text-2xl md:text-3xl font-semibold">Welcome!</CardTitle>
           <p className="text-muted-foreground text-sm pt-2"> Your AI study partner. Login or register below. </p>
        </CardHeader>
        <CardContent className="p-6 md:p-8 pt-4">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {/* ----- Login Form ----- */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="grid gap-4">
                {/* Display General Login Error (from API) */}
                {errors.generalLogin && (
                     <div className="bg-destructive/10 border border-destructive text-destructive text-xs rounded-md p-2.5 text-center flex items-center justify-center gap-1.5">
                         <AlertCircle className="h-4 w-4 shrink-0"/>{errors.generalLogin}
                     </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="login-phone">Phone Number</Label>
                  <Input
                    type="tel" id="login-phone" value={loginPhoneNumber}
                    onChange={(e) => { setLoginPhoneNumber(e.target.value); setErrors(p => ({...p, loginPhone: undefined, generalLogin: undefined})); }}
                    placeholder="e.g., 0912345678" required disabled={isLoggingIn}
                    className={cn(getInputClass(!!errors.loginPhone || !!errors.generalLogin))}
                    aria-invalid={!!errors.loginPhone || !!errors.generalLogin}
                    aria-describedby={errors.loginPhone ? "login-phone-error" : errors.generalLogin ? "login-general-form-error" : undefined}
                  />
                  {errors.loginPhone && <p id="login-phone-error" className="text-xs text-destructive flex items-center gap-1 pt-1"><AlertCircle className="h-3.5 w-3.5 shrink-0"/>{errors.loginPhone}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    type="password" id="login-password" value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value); setErrors(p => ({...p, loginPassword: undefined, generalLogin: undefined})); }}
                    placeholder="Enter your password" required disabled={isLoggingIn}
                    className={cn(getInputClass(!!errors.loginPassword || !!errors.generalLogin))}
                    aria-invalid={!!errors.loginPassword || !!errors.generalLogin}
                     aria-describedby={errors.loginPassword ? "login-password-error" : errors.generalLogin ? "login-general-form-error" : undefined}
                    />
                   {errors.loginPassword && <p id="login-password-error" className="text-xs text-destructive flex items-center gap-1 pt-1"><AlertCircle className="h-3.5 w-3.5 shrink-0"/>{errors.loginPassword}</p>}
                </div>
                <Button type="submit" disabled={isLoggingIn} className="mt-2 w-full">
                    {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Login
                </Button>
              </form>
            </TabsContent>

            {/* ----- Register Form ----- */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="grid gap-4">
                 {/* Display General Register Error (from API) */}
                 {errors.generalRegister && (
                     <div className="bg-destructive/10 border border-destructive text-destructive text-xs rounded-md p-2.5 text-center flex items-center justify-center gap-1.5">
                         <AlertCircle className="h-4 w-4 shrink-0"/>{errors.generalRegister}
                     </div>
                 )}
                 <div className="space-y-1.5">
                    <Label htmlFor="register-fullname">Full Name</Label>
                    <Input type="text" id="register-fullname" value={registerFullName} onChange={(e) => { setRegisterFullName(e.target.value); setErrors(p => ({...p, registerFullName: undefined, generalRegister: undefined})); }} placeholder="Enter your full name" required disabled={isRegistering} className={cn(getInputClass(!!errors.registerFullName))} aria-invalid={!!errors.registerFullName} aria-describedby={errors.registerFullName ? "register-fullname-error" : undefined} />
                    {errors.registerFullName && <p id="register-fullname-error" className="text-xs text-destructive flex items-center gap-1 pt-1"><AlertCircle className="h-3.5 w-3.5 shrink-0"/>{errors.registerFullName}</p>}
                 </div>
                 <div className="space-y-1.5">
                    <Label htmlFor="register-grade">Grade Level</Label>
                    <Select value={registerGradeLevel} onValueChange={(value) => { setRegisterGradeLevel(value); setErrors(p => ({...p, registerGrade: undefined, generalRegister: undefined})); }} required disabled={isRegistering} >
                        <SelectTrigger id="register-grade" className={cn("h-10 md:h-9", getInputClass(!!errors.registerGrade))} aria-invalid={!!errors.registerGrade} aria-describedby={errors.registerGrade ? "register-grade-error" : undefined}><SelectValue placeholder="Select your grade" /></SelectTrigger>
                        <SelectContent>{availableGrades.map((grade) => ( <SelectItem key={grade} value={grade}>Grade {grade}</SelectItem> ))}</SelectContent>
                    </Select>
                    {errors.registerGrade && <p id="register-grade-error" className="text-xs text-destructive flex items-center gap-1 pt-1"><AlertCircle className="h-3.5 w-3.5 shrink-0"/>{errors.registerGrade}</p>}
                 </div>
                 <div className="space-y-1.5">
                    <Label htmlFor="register-phone">Phone Number</Label>
                    <Input type="tel" id="register-phone" value={registerPhoneNumber} onChange={(e) => { setRegisterPhoneNumber(e.target.value); setErrors(p => ({...p, registerPhone: undefined, generalRegister: undefined})); }} placeholder="e.g., 0912345678" required disabled={isRegistering} className={cn(getInputClass(!!errors.registerPhone))} aria-invalid={!!errors.registerPhone} aria-describedby={errors.registerPhone ? "register-phone-error" : "register-phone-hint"} />
                    {errors.registerPhone ? ( <p id="register-phone-error" className="text-xs text-destructive flex items-center gap-1 pt-1"><AlertCircle className="h-3.5 w-3.5 shrink-0"/>{errors.registerPhone}</p> ) : ( <p id="register-phone-hint" className="text-xs text-muted-foreground pt-1">Enter 10 digits (09... or 07...).</p> )}
                 </div>
                 <div className="space-y-1.5">
                    <Label htmlFor="register-password">Password</Label>
                    <Input type="password" id="register-password" value={registerPassword} onChange={(e) => { setRegisterPassword(e.target.value); setErrors(p => ({...p, registerPassword: undefined, generalRegister: undefined})); }} placeholder="Create a password (min 6 characters)" required minLength={6} disabled={isRegistering} className={cn(getInputClass(!!errors.registerPassword))} aria-invalid={!!errors.registerPassword} aria-describedby={errors.registerPassword ? "register-password-error" : undefined} />
                    {errors.registerPassword && <p id="register-password-error" className="text-xs text-destructive flex items-center gap-1 pt-1"><AlertCircle className="h-3.5 w-3.5 shrink-0"/>{errors.registerPassword}</p>}
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

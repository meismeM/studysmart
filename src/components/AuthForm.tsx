// src/components/AuthForm.tsx
"use client";

import { useState } from "react";
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"; // Combined imports
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast"; 
import { Loader2, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Ensure UserData here matches the one in page.tsx and API responses
type UserData = {
  id?: string | number;
  fullName?: string;
  gradeLevel?: string;
  phoneNumber?: string;
  is_confirmed?: boolean;
  registered_at?: string;
} | null;

// *** THIS IS THE CRUCIAL CHANGE IN AuthForm.tsx ***
interface AuthFormProps {
  onLoginSuccess: (userData: UserData) => void; // Prop name is now onLoginSuccess
}

const availableGrades = ["9", "10", "11", "12"];

type FormErrors = { /* ... same as your definition ... */ };

const AuthForm: React.FC<AuthFormProps> = ({ onLoginSuccess }) => { // Use onLoginSuccess
  const [activeTab, setActiveTab] = useState("login");
  const { toast } = useToast();

  const [loginPhoneNumber, setLoginPhoneNumber] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [registerPhoneNumber, setRegisterPhoneNumber] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerFullName, setRegisterFullName] = useState("");
  const [registerGradeLevel, setRegisterGradeLevel] = useState<string>("");
  const [isRegistering, setIsRegistering] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  
  const validateLogin = (): boolean => { /* ... your existing validation ... */ return true; };
  const validateRegistration = (): boolean => { /* ... your existing validation ... */ return true; };


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({}); 
    if (!validateLogin()) return; 

    setIsLoggingIn(true);
    try {
        const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber: loginPhoneNumber.trim(), password: loginPassword }), });
        const data = await response.json();

        if (response.ok && data.success) {
            toast({ title: "Success", description: "Login successful!" });
            // *** CALL THE CORRECT PROP ***
            onLoginSuccess(data.user || null); 
        } else {
            setErrors({ generalLogin: data.message || "Invalid phone number or password." });
        }
    } catch (error: any) {
        setErrors({ generalLogin: "Login failed. Check connection or try again." });
    } finally {
        setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!validateRegistration()) return;

    setIsRegistering(true);
    const trimmedPhoneNumber = registerPhoneNumber.trim();
    const trimmedFullName = registerFullName.trim();

    try {
        const response = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber: trimmedPhoneNumber, password: registerPassword, fullName: trimmedFullName, gradeLevel: registerGradeLevel }), });
        const data = await response.json();

        if (response.ok && data.success) {
            toast({ title: "Registration Successful", description: data.message || "Account created!" });
             // ** CALL THE CORRECT PROP (API already implies login by returning user) **
             onLoginSuccess(data.user || null); 
        } else {
            if (response.status === 409) { 
                setErrors({ registerPhone: data.message || "Phone number already taken." });
            } else {
                 setErrors({ generalRegister: data.message || "Registration failed. Please check details." });
            }
        }
    } catch (error: any) {
      setErrors({ generalRegister: "Registration failed. Check connection or try again." });
    } finally {
       setIsRegistering(false);
    }
  };
  
  const getInputClass = (hasError?: boolean) => { /* ... your existing function ... */ return ""; };


  return (
    // YOUR FULL JSX FOR AUTHFORM. Ensure it's correct.
    // This is just a placeholder to make the code runnable.
    <div className="container mx-auto p-4 flex flex-col justify-center items-center min-h-screen">
      <div className="mb-6"> <Image src="/logo.png" alt="App Logo" width={80} height={80} priority /> </div>
      <Card className="w-full max-w-md md:max-w-lg shadow-xl border">
        <CardHeader className="p-6 md:p-8 text-center">
          <CardTitle className="text-2xl md:text-3xl font-semibold">Welcome!</CardTitle>
           <p className="text-muted-foreground text-sm pt-2"> Your AI study partner. Login or register below. </p>
        </CardHeader>
        <CardContent className="p-6 md:p-8 pt-4">
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="grid gap-4">
                {errors.generalLogin && ( <div className="bg-destructive/10 border border-destructive text-destructive text-xs rounded-md p-2.5 text-center flex items-center justify-center gap-1.5"> <AlertCircle className="h-4 w-4 shrink-0"/>{errors.generalLogin}</div> )}
                <div className="space-y-1.5">
                  <Label htmlFor="login-phone">Phone Number</Label>
                  <Input type="tel" id="login-phone" value={loginPhoneNumber} onChange={(e) => { setLoginPhoneNumber(e.target.value); setErrors(p => ({...p, loginPhone: undefined, generalLogin: undefined})); }} placeholder="e.g., 0912345678" required disabled={isLoggingIn} className={cn(getInputClass(!!errors.loginPhone || !!errors.generalLogin))} aria-invalid={!!errors.loginPhone || !!errors.generalLogin} aria-describedby={errors.loginPhone ? "login-phone-error" : errors.generalLogin ? "login-general-form-error" : undefined}/>
                  {errors.loginPhone && <p id="login-phone-error" className="text-xs text-destructive flex items-center gap-1 pt-1"><AlertCircle className="h-3.5 w-3.5 shrink-0"/>{errors.loginPhone}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Password</Label>
                  <Input type="password" id="login-password" value={loginPassword} onChange={(e) => { setLoginPassword(e.target.value); setErrors(p => ({...p, loginPassword: undefined, generalLogin: undefined})); }} placeholder="Enter your password" required disabled={isLoggingIn} className={cn(getInputClass(!!errors.loginPassword || !!errors.generalLogin))} aria-invalid={!!errors.loginPassword || !!errors.generalLogin} aria-describedby={errors.loginPassword ? "login-password-error" : errors.generalLogin ? "login-general-form-error" : undefined} />
                   {errors.loginPassword && <p id="login-password-error" className="text-xs text-destructive flex items-center gap-1 pt-1"><AlertCircle className="h-3.5 w-3.5 shrink-0"/>{errors.loginPassword}</p>}
                </div>
                <Button type="submit" disabled={isLoggingIn} className="mt-2 w-full"> {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Login </Button>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="grid gap-4">
                 {errors.generalRegister && ( <div className="bg-destructive/10 border border-destructive text-destructive text-xs rounded-md p-2.5 text-center flex items-center justify-center gap-1.5"> <AlertCircle className="h-4 w-4 shrink-0"/>{errors.generalRegister}</div> )}
                 <div className="space-y-1.5">
                    <Label htmlFor="register-fullname">Full Name</Label>
                    <Input type="text" id="register-fullname" value={registerFullName} onChange={(e) => { setRegisterFullName(e.target.value); setErrors(p => ({...p, registerFullName: undefined, generalRegister: undefined})); }} placeholder="Enter your full name" required disabled={isRegistering} className={cn(getInputClass(!!errors.registerFullName))} aria-invalid={!!errors.registerFullName} aria-describedby={errors.registerFullName ? "register-fullname-error" : undefined} />
                    {errors.registerFullName && <p id="register-fullname-error" className="text-xs text-destructive flex items-center gap-1 pt-1"><AlertCircle className="h-3.5 w-3.5 shrink-0"/>{errors.registerFullName}</p>}
                 </div>
                 <div className="space-y-1.5">
                    <Label htmlFor="register-grade">Grade Level</Label>
                    <Select value={registerGradeLevel} onValueChange={(value) => { setRegisterGradeLevel(value); setErrors(p => ({...p, registerGrade: undefined, generalRegister: undefined})); }} required disabled={isRegistering} >
                        <SelectTrigger id="register-grade" className={cn("h-10 md:h-9", getInputClass(!!errors.registerGrade))} aria-invalid={!!errors.registerGrade} aria-describedby={errors.registerGrade ? "register-grade-error" : undefined}><SelectValue placeholder="Select your grade" /></SelectTrigger>
                        <SelectContent>{availableGrades.map((gradeOpt) => ( <SelectItem key={gradeOpt} value={gradeOpt}>Grade {gradeOpt}</SelectItem> ))}</SelectContent>
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
                 <Button type="submit" disabled={isRegistering} className="mt-2 w-full"> {isRegistering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Register</Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;

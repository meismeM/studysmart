"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface AuthFormProps {
  setIsLoggedIn: (isLoggedIn: boolean) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ setIsLoggedIn }) => {
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, you would authenticate against a backend service
    if (loginUsername === "admin" && loginPassword === "password") {
      setIsLoggedIn(true); // Set isLoggedIn to true upon successful login
    } else {
      toast({
        title: "Error",
        description: "Invalid credentials",
        variant: "destructive",
      });
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerUsername || !registerPassword) {
      toast({
        title: "Error",
        description: "Username and password cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    // Simulate successful registration
    toast({
      title: "Success",
      description: "Registration successful!",
    });
    setIsLoggedIn(true); // Set isLoggedIn to true upon successful registration
  };

  return (
    <div className="container mx-auto p-4 flex justify-center items-center h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isRegistering ? "Register" : "Login"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-[400px]">
            <TabsList>
              <TabsTrigger value="login" onClick={() => setIsRegistering(false)}>Login</TabsTrigger>
              <TabsTrigger value="register" onClick={() => setIsRegistering(true)}>Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleSubmit} className="grid gap-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    type="text"
                    id="username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Enter your username"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    type="password"
                    id="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
                <Button type="submit">Login</Button>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="grid gap-4">
                <div>
                  <Label htmlFor="newUsername">Username</Label>
                  <Input
                    type="text"
                    id="newUsername"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    placeholder="Enter your username"
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword">Password</Label>
                  <Input
                    type="password"
                    id="newPassword"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
                <Button type="submit">Register</Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;

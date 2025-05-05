import { useAuth } from "@/context/auth-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Helmet } from "react-helmet";
import { useState } from "react";
import { Inbox } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function Login() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError("");

    try {
      console.log("Iniciando login com:", data.username);
      await login(data.username, data.password);
      console.log("Login realizado com sucesso");
    } catch (error) {
      console.error("Erro no formulário de login:", error);
      
      // Mensagem de erro mais amigável
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Não foi possível realizar o login. Tente novamente.");
      }

      // Manter usuário e senha para facilitar uma nova tentativa
      form.setValue("password", "");
      form.setFocus("password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Login | OmniConnect</title>
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white p-8 rounded-lg shadow-sm border border-neutral-200">
            <div className="flex justify-center mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary-500 rounded flex items-center justify-center">
                  <Inbox className="text-white" size={24} />
                </div>
                <span className="ml-2 text-xl font-semibold text-neutral-900">OmniConnect</span>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-center text-neutral-900 mb-6">
              Sign in to your account
            </h1>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded mb-4">
                {error}
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your username"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-primary-500 hover:bg-primary-600"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <p className="text-sm text-neutral-500">
                Contas de demonstração: <strong>admin/admin</strong> ou <strong>agent/agent</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;

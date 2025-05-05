import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Sidebar } from "@/components/sidebar";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, Users, Edit, Trash } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { queryClient } from "@/lib/queryClient";
import type { Organization } from "@shared/schema";

// Schema para validação do formulário de criação de organização
const organizationFormSchema = z.object({
  name: z.string().min(2, { message: "Nome deve ter no mínimo 2 caracteres" }),
  slug: z.string().min(2, { message: "Slug deve ter no mínimo 2 caracteres" })
    .regex(/^[a-z0-9-]+$/, { message: "Slug deve conter apenas letras minúsculas, números e hífen" }),
  schema: z.string().min(2, { message: "Schema deve ter no mínimo 2 caracteres" })
    .regex(/^[a-z0-9_]+$/, { message: "Schema deve conter apenas letras minúsculas, números e underscore" }),
  supportEmail: z.string().email({ message: "E-mail inválido" }).optional().nullable(),
  primaryColor: z.string().optional(),
  planType: z.enum(["basic", "professional", "enterprise"]).default("basic"),
});

type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

export default function OrganizationsPage() {
  const [isModalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();

  // Obter lista de organizações
  const { data: organizations, isLoading } = useQuery<Organization[]>({
    queryKey: ["/api/my-organizations"],
  });

  // Formulário para criar organização
  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      schema: "",
      supportEmail: "",
      primaryColor: "#1E40AF",
      planType: "basic",
    },
  });

  // Função para criar uma nova organização
  async function onSubmit(values: OrganizationFormValues) {
    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao criar organização");
      }

      // Atualizar a lista de organizações
      queryClient.invalidateQueries({ queryKey: ["/api/my-organizations"] });

      // Fechar o modal e mostrar mensagem de sucesso
      setModalOpen(false);
      form.reset();
      toast({
        title: "Organização criada com sucesso",
        description: `A organização ${values.name} foi criada.`,
      });
    } catch (error) {
      console.error("Erro ao criar organização:", error);
      toast({
        title: "Erro ao criar organização",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao criar a organização",
        variant: "destructive",
      });
    }
  }

  return (
    <>
      <Helmet>
        <title>Organizações | OmniConnect</title>
      </Helmet>

      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-2xl font-bold">Organizações</h1>
                <p className="text-muted-foreground">
                  Gerencie suas organizações e as configurações de multi-tenancy
                </p>
              </div>
              <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Organização
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>Criar nova organização</DialogTitle>
                    <DialogDescription>
                      Preencha os dados para criar uma nova organização no sistema
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome da organização" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Slug</FormLabel>
                            <FormControl>
                              <Input placeholder="nome-da-org" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="schema"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Schema</FormLabel>
                            <FormControl>
                              <Input placeholder="nome_da_org" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="supportEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email de suporte</FormLabel>
                            <FormControl>
                              <Input placeholder="suporte@exemplo.com" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="primaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cor primária</FormLabel>
                            <FormControl>
                              <Input type="color" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                          {form.formState.isSubmitting ? "Criando..." : "Criar organização"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : organizations && organizations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations.map((org) => (
                  <Card key={org.id} className="border-l-4" style={{ borderLeftColor: org.primaryColor || '#1E40AF' }}>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Building2 className="mr-2 h-5 w-5" />
                        {org.name}
                      </CardTitle>
                      <CardDescription>Slug: {org.slug}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Plano:</span>
                          <span className="font-medium capitalize">{org.planType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span className={`font-medium ${org.active ? 'text-green-600' : 'text-red-600'}`}>
                            {org.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        {org.supportEmail && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Suporte:</span>
                            <span className="font-medium">{org.supportEmail}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button variant="outline" size="sm">
                        <Users className="mr-2 h-4 w-4" />
                        Usuários
                      </Button>
                      <div className="space-x-2">
                        <Button variant="outline" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center p-12 bg-muted rounded-lg">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma organização encontrada</h3>
                <p className="text-muted-foreground mb-6">
                  Você ainda não tem organizações cadastradas no sistema.
                </p>
                <Button onClick={() => setModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar organização
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
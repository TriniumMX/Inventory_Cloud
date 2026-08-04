import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  Building2, 
  Briefcase, 
  Shield, 
  Settings,
  Check,
  X,
  AlertCircle,
  Info
} from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";

export default function Styleguide() {
  const colors = [
    { name: "Background", var: "--background", class: "bg-background", textClass: "text-foreground" },
    { name: "Foreground", var: "--foreground", class: "bg-foreground", textClass: "text-background" },
    { name: "Primary", var: "--primary", class: "bg-primary", textClass: "text-primary-foreground" },
    { name: "Secondary", var: "--secondary", class: "bg-secondary", textClass: "text-secondary-foreground" },
    { name: "Muted", var: "--muted", class: "bg-muted", textClass: "text-muted-foreground" },
    { name: "Accent", var: "--accent", class: "bg-accent", textClass: "text-accent-foreground" },
    { name: "Destructive", var: "--destructive", class: "bg-destructive", textClass: "text-destructive-foreground" },
    { name: "Card", var: "--card", class: "bg-card", textClass: "text-card-foreground" },
    { name: "Border", var: "--border", class: "bg-border", textClass: "text-foreground" },
  ];

  const icons = [
    { Icon: Package, name: "Package" },
    { Icon: Building2, name: "Building2" },
    { Icon: Briefcase, name: "Briefcase" },
    { Icon: Shield, name: "Shield" },
    { Icon: Settings, name: "Settings" },
    { Icon: Check, name: "Check" },
    { Icon: X, name: "X" },
    { Icon: AlertCircle, name: "AlertCircle" },
    { Icon: Info, name: "Info" },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[{ label: "Styleguide" }]} />
      <main className="flex-1 overflow-auto p-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Design System</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Guía de estilos y componentes del sistema de inventarios
          </p>
        </div>

        <Separator />

        {/* Colors Section */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Paleta de Colores</h2>
            <p className="text-sm text-muted-foreground">
              Tokens de color definidos en el design system (HSL)
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            {colors.map((color) => (
              <Card key={color.name}>
                <CardContent className="p-4">
                  <div className={`${color.class} ${color.textClass} rounded-lg p-6 mb-3 flex items-center justify-center font-medium`}>
                    {color.name}
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="font-mono text-xs text-muted-foreground">{color.var}</p>
                    <p className="font-mono text-xs">{color.class}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        {/* Typography Section */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Tipografía</h2>
            <p className="text-sm text-muted-foreground">
              Escala de tamaños y pesos tipográficos
            </p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h1 className="text-4xl font-bold">Heading 1 - 4xl Bold</h1>
                <code className="text-xs text-muted-foreground">text-4xl font-bold</code>
              </div>
              <div>
                <h2 className="text-3xl font-bold">Heading 2 - 3xl Bold</h2>
                <code className="text-xs text-muted-foreground">text-3xl font-bold</code>
              </div>
              <div>
                <h3 className="text-2xl font-bold">Heading 3 - 2xl Bold</h3>
                <code className="text-xs text-muted-foreground">text-2xl font-bold</code>
              </div>
              <div>
                <h4 className="text-xl font-semibold">Heading 4 - xl Semibold</h4>
                <code className="text-xs text-muted-foreground">text-xl font-semibold</code>
              </div>
              <div>
                <p className="text-base">Body Text - Base Regular</p>
                <code className="text-xs text-muted-foreground">text-base</code>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Small Text - sm Muted</p>
                <code className="text-xs text-muted-foreground">text-sm text-muted-foreground</code>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Extra Small - xs Muted</p>
                <code className="text-xs text-muted-foreground">text-xs text-muted-foreground</code>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Buttons Section */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Botones</h2>
            <p className="text-sm text-muted-foreground">
              Variantes y tamaños de botones disponibles
            </p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Variantes</h3>
                <div className="flex flex-wrap gap-3">
                  <Button>Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Tamaños</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon"><Package className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Con Iconos</h3>
                <div className="flex flex-wrap gap-3">
                  <Button><Package className="mr-2 h-4 w-4" />Con Icono</Button>
                  <Button variant="outline"><Shield className="mr-2 h-4 w-4" />Outline</Button>
                  <Button variant="secondary"><Settings className="mr-2 h-4 w-4" />Secondary</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Badges Section */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Badges</h2>
            <p className="text-sm text-muted-foreground">
              Etiquetas y estados
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-3">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge className="bg-secondary/10 text-secondary border-secondary">
                  <Check className="mr-1 h-3 w-3" />
                  Activo
                </Badge>
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  En Almacen
                </Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Icons Section */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Iconos</h2>
            <p className="text-sm text-muted-foreground">
              Iconos de Lucide React más utilizados
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-6">
                {icons.map(({ Icon, name }) => (
                  <div key={name} className="flex flex-col items-center gap-2">
                    <div className="p-3 rounded-lg bg-muted">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs text-center">{name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Cards Section */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Cards</h2>
            <p className="text-sm text-muted-foreground">
              Componentes de tarjetas y contenedores
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Card description goes here</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">This is the card content area.</p>
              </CardContent>
            </Card>

            <StatCard
              title="Stat Card"
              value="1,234"
              icon={Package}
              description="Example stat card"
              trend={{ value: 12, isPositive: true }}
            />
          </div>
        </section>

        <Separator />

        {/* Forms Section */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Formularios</h2>
            <p className="text-sm text-muted-foreground">
              Elementos de entrada y formularios
            </p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="input-default">Input Default</Label>
                  <Input id="input-default" placeholder="Placeholder text..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="input-disabled">Input Disabled</Label>
                  <Input id="input-disabled" placeholder="Disabled..." disabled />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Spacing Section */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Espaciado</h2>
            <p className="text-sm text-muted-foreground">
              Escala de espaciado de Tailwind (múltiplos de 0.25rem)
            </p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-3">
              {[1, 2, 3, 4, 6, 8, 12, 16, 24].map((space) => (
                <div key={space} className="flex items-center gap-4">
                  <code className="text-sm w-16">space-{space}</code>
                  <div className="bg-primary h-6" style={{ width: `${space * 0.25}rem` }}></div>
                  <span className="text-sm text-muted-foreground">{space * 0.25}rem / {space * 4}px</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Border Radius Section */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Border Radius</h2>
            <p className="text-sm text-muted-foreground">
              Valores de radio de borde (--radius: 0.5rem base)
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 bg-primary rounded-sm"></div>
                  <code className="text-xs">rounded-sm</code>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 bg-primary rounded-md"></div>
                  <code className="text-xs">rounded-md</code>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 bg-primary rounded-lg"></div>
                  <code className="text-xs">rounded-lg</code>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 bg-primary rounded-full"></div>
                  <code className="text-xs">rounded-full</code>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Design Tokens Summary */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Design Tokens</h2>
            <p className="text-sm text-muted-foreground">
              Variables CSS definidas en index.css
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-2 font-mono text-sm">
                <p className="text-muted-foreground">/* Colores Principales */</p>
                <p>--primary: 221 83% 53% (Azul institucional)</p>
                <p>--secondary: 142 71% 45% (Verde)</p>
                <p>--background: 0 0% 98% (Fondo claro)</p>
                <p>--foreground: 222 47% 11% (Texto oscuro)</p>
                
                <p className="text-muted-foreground mt-4">/* Sidebar */</p>
                <p>--sidebar-background: 222 47% 11% (Oscuro)</p>
                <p>--sidebar-primary: 221 83% 53% (Azul)</p>
                
                <p className="text-muted-foreground mt-4">/* Otros */</p>
                <p>--radius: 0.5rem</p>
                <p>--destructive: 0 84% 60% (Rojo)</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

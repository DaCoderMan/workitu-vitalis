"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
  Settings,
  Link2,
  Upload,
  User,
  Moon,
  Sun,
  Shield,
  Trash2,
  ExternalLink,
  CheckCircle2,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Connect WHOOP                                                      */
/* ------------------------------------------------------------------ */

function ConnectWhoop() {
  const [connected, setConnected] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="size-5 text-teal-400" />
          Connect WHOOP
        </CardTitle>
        <CardDescription>
          Link your WHOOP band for automatic data sync
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connected ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <CheckCircle2 className="size-5 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-400">Connected</p>
              <p className="text-xs text-muted-foreground">
                WHOOP 4.0 -- Last synced 2 hours ago
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-teal-500/15">
              <Link2 className="size-6 text-teal-400" />
            </div>
            <p className="text-sm text-muted-foreground">
              Connect your WHOOP band to automatically sync HRV, sleep, strain,
              and recovery data.
            </p>
          </div>
        )}
        <Button
          className={cn(
            "w-full",
            connected
              ? ""
              : "bg-gradient-to-r from-teal-500 to-emerald-500 text-white"
          )}
          variant={connected ? "outline" : "default"}
          onClick={() => {
            if (connected) {
              setConnected(false);
            } else {
              // In production, redirect to WHOOP OAuth
              setConnected(true);
            }
          }}
        >
          {connected ? (
            "Disconnect"
          ) : (
            <>
              <ExternalLink className="mr-2 size-4" />
              Connect with WHOOP
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Upload Apple Health                                                */
/* ------------------------------------------------------------------ */

function UploadAppleHealth() {
  const [dragActive, setDragActive] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="size-5 text-blue-400" />
          Apple Health Import
        </CardTitle>
        <CardDescription>
          Upload your Apple Health export ZIP file
        </CardDescription>
      </CardHeader>
      <CardContent>
        {uploaded ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <CheckCircle2 className="size-5 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-400">
                Data Imported
              </p>
              <p className="text-xs text-muted-foreground">
                1,247 readings imported from Apple Health
              </p>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all",
              dragActive
                ? "border-blue-500 bg-blue-500/5"
                : "border-border/60 bg-muted/20"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              setUploaded(true);
            }}
          >
            <FileText className="mb-2 size-8 text-blue-400/60" />
            <p className="text-sm text-muted-foreground">
              Drop export.zip here or click to browse
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setUploaded(true)}
            >
              Browse Files
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Personal Info Form                                                 */
/* ------------------------------------------------------------------ */

function PersonalInfoForm() {
  const [age, setAge] = useState("32");
  const [weight, setWeight] = useState("75");
  const [height, setHeight] = useState("178");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="size-5 text-violet-400" />
          Personal Information
        </CardTitle>
        <CardDescription>
          Used for baseline calibration of insights
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="age" className="text-xs text-muted-foreground">
              Age
            </Label>
            <Input
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight" className="text-xs text-muted-foreground">
              Weight (kg)
            </Label>
            <Input
              id="weight"
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height" className="text-xs text-muted-foreground">
              Height (cm)
            </Label>
            <Input
              id="height"
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="h-9"
            />
          </div>
        </div>
        <Button onClick={handleSave} className="w-full" variant="outline">
          {saved ? (
            <>
              <CheckCircle2 className="mr-2 size-4 text-emerald-400" />
              Saved!
            </>
          ) : (
            "Save Profile"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Theme Toggle                                                       */
/* ------------------------------------------------------------------ */

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {theme === "dark" ? (
            <Moon className="size-5 text-blue-400" />
          ) : (
            <Sun className="size-5 text-amber-400" />
          )}
          Appearance
        </CardTitle>
        <CardDescription>Customize the look and feel</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Dark Mode</p>
            <p className="text-xs text-muted-foreground">
              Toggle between light and dark themes
            </p>
          </div>
          <Switch
            checked={theme === "dark"}
            onCheckedChange={(checked) =>
              setTheme(checked ? "dark" : "light")
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Medical Disclaimer                                                 */
/* ------------------------------------------------------------------ */

function MedicalDisclaimerCard() {
  const [acknowledged, setAcknowledged] = useState(true);

  return (
    <Card className="border-amber-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-5 text-amber-400" />
          Medical Disclaimer
        </CardTitle>
        <CardDescription>Important health information notice</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Vitalis is a wellness tool, not a medical device. It is not intended
            to diagnose, treat, cure, or prevent any disease. The insights
            provided are for informational purposes only. Always consult your
            healthcare provider before making changes to your health routine,
            medications, or supplements.
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">I understand and acknowledge</p>
            <p className="text-xs text-muted-foreground">
              Required to use Vitalis insights
            </p>
          </div>
          <Switch
            checked={acknowledged}
            onCheckedChange={setAcknowledged}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete Data                                                        */
/* ------------------------------------------------------------------ */

function DeleteDataSection() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="border-red-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="size-5 text-red-400" />
          Data Management
        </CardTitle>
        <CardDescription>
          Permanently delete all your health data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-400">Danger Zone</p>
              <p className="mt-1 text-xs text-muted-foreground">
                This action is irreversible. All your readings, insights,
                scores, and preferences will be permanently deleted.
              </p>
            </div>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="mt-4 w-full">
              <Trash2 className="mr-2 size-4" />
              Delete All Data
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you absolutely sure?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete all
                your health data, insights, and account preferences from our
                servers.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setOpen(false);
                  // In production, call delete API
                }}
              >
                Yes, delete everything
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings Page                                                      */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account, devices, and preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ConnectWhoop />
        <UploadAppleHealth />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PersonalInfoForm />
        <ThemeToggle />
      </div>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-2">
        <MedicalDisclaimerCard />
        <DeleteDataSection />
      </div>
    </div>
  );
}

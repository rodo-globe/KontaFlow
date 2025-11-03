'use client';

import { Building2, Menu, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/contexts/I18nContext';
import { languages, type Locale } from '@/i18n/locales';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { locale, setLocale } = useTranslation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm">
      <div className="flex h-16 items-center gap-4 px-6">
        {/* Menu toggle para móvil */}
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo y nombre */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">KontaFlow</h1>
            <p className="text-xs text-gray-500">Sistema Contable</p>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Language selector */}
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-gray-500" />
          <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(languages).map(([code, name]) => (
                <SelectItem key={code} value={code}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">Usuario Demo</p>
            <p className="text-xs text-gray-500">Administrador</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-700">
            <span className="text-sm font-semibold">UD</span>
          </div>
        </div>
      </div>
    </header>
  );
}

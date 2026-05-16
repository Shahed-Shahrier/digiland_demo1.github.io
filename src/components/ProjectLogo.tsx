import { cn } from '@/lib/utils';

const logoSrc = `${import.meta.env.BASE_URL}digiland-icon.png`;

type ProjectLogoProps = {
  className?: string;
  imageClassName?: string;
};

export function ProjectLogo({ className, imageClassName }: ProjectLogoProps) {
  return (
    <span className={cn('inline-flex items-center justify-center overflow-hidden rounded-lg bg-white/95 shadow-sm', className)}>
      <img
        src={logoSrc}
        alt="Digi-Land"
        className={cn('h-full w-full object-cover', imageClassName)}
      />
    </span>
  );
}

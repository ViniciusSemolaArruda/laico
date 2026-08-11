import {
  Clock,
  LockKeyhole,
  Mail,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

import Link from "next/link";
import type { ReactNode, SVGProps } from "react";

import styles from "./Footer.module.css";

const institutionalLinks = [
  { label: "Sobre nós", href: "/sobre" },
  { label: "Nossa missão", href: "/sobre#nossa-missao" },
  {
    label: "Política de privacidade",
    href: "/politica-de-privacidade",
  },
  {
    label: "Trocas e devoluções",
    href: "/trocas-e-devolucoes",
  },
  { label: "Fale conosco", href: "/contato" },
] as const;

const accountLinks = [
  { label: "Minha conta", href: "/minha-conta" },
  { label: "Meus pedidos", href: "/minha-conta#pedidos" },
  { label: "Endereços", href: "/minha-conta#enderecos" },
  { label: "Entrar ou cadastrar-se", href: "/entrar" },
] as const;

const legalLinks = [
  {
    label: "Política de privacidade",
    href: "/politica-de-privacidade",
  },
  {
    label: "Trocas e devoluções",
    href: "/trocas-e-devolucoes",
  },
  {
    label: "Formas de pagamento",
    href: "/formas-de-pagamento",
  },
  { label: "Prazo de entrega", href: "/prazo-de-entrega" },
  {
    label: "Perguntas frequentes",
    href: "/contato#duvidas-frequentes",
  },
] as const;

const paymentMethods = [
  {
    name: "Pix",
    file: "pix.svg",
  },
  {
    name: "Visa",
    file: "visa.svg",
  },
  {
    name: "Mastercard",
    file: "master.svg",
  },
  {
    name: "Elo",
    file: "elo.svg",
  },
  {
    name: "American Express",
    file: "amex.svg",
  },
  {
    name: "Boleto bancário",
    file: "boleto.svg",
  },
] as const;

const PAYMENT_LOGO_BASE_URL =
  "https://cdn.sistemawbuy.com.br/img/bandeiras/novo";

function normalizeExternalUrl(value: string | undefined) {
  const normalized = value?.trim() || "";

  if (!normalized) {
    return "";
  }

  try {
    const url = new URL(normalized);

    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function normalizePhone(value: string | undefined) {
  return value?.replace(/\D/g, "").slice(0, 15) || "";
}

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "";

  const supportPhoneLabel =
    process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() || "";

  const supportWhatsApp = normalizePhone(
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP,
  );

  const legalName =
    process.env.NEXT_PUBLIC_STORE_LEGAL_NAME?.trim() || "";

  const legalDocument =
    process.env.NEXT_PUBLIC_STORE_DOCUMENT?.trim() || "";

  const businessAddress =
    process.env.NEXT_PUBLIC_STORE_ADDRESS?.trim() || "";

  const instagramUrl = normalizeExternalUrl(
    process.env.NEXT_PUBLIC_INSTAGRAM_URL,
  );

  const facebookUrl = normalizeExternalUrl(
    process.env.NEXT_PUBLIC_FACEBOOK_URL,
  );

  const youtubeUrl = normalizeExternalUrl(
    process.env.NEXT_PUBLIC_YOUTUBE_URL,
  );

  const socialLinks: Array<{
    label: string;
    href: string;
    icon: ReactNode;
  }> = [];

  if (instagramUrl) {
    socialLinks.push({
      label: "Instagram da Laico",
      href: instagramUrl,
      icon: <InstagramIcon className={styles.socialSvg} />,
    });
  }

  if (facebookUrl) {
    socialLinks.push({
      label: "Facebook da Laico",
      href: facebookUrl,
      icon: <FacebookIcon className={styles.socialSvg} />,
    });
  }

  if (supportWhatsApp) {
    socialLinks.push({
      label: "WhatsApp da Laico",
      href: `https://wa.me/${supportWhatsApp}`,
      icon: <MessageCircle size={19} aria-hidden="true" />,
    });
  }

  if (youtubeUrl) {
    socialLinks.push({
      label: "YouTube da Laico",
      href: youtubeUrl,
      icon: <YouTubeIcon className={styles.socialSvg} />,
    });
  }

  const supplierIdentification = [
    legalName,
    legalDocument,
    businessAddress,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <footer className={styles.footer}>
      <div className={styles.mainContainer}>
        <div className={styles.brandColumn}>
          <Link
            href="/"
            aria-label="Ir para a página inicial da Laico"
            className={styles.logoLink}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo3.png" alt="Laico" className={styles.logo} />
          </Link>

          <p className={styles.brandDescription}>
            A Laico é um espaço de fé, cultura e espiritualidade. Respeitamos
            todas as crenças e promovemos a diversidade religiosa e cultural.
          </p>

          {socialLinks.length > 0 && (
            <div className={styles.socialLinks}>
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className={styles.socialLink}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          )}
        </div>

        <FooterLinkColumn title="Institucional" links={institutionalLinks} />

        <FooterLinkColumn title="Minha conta" links={accountLinks} />

        <div className={styles.column}>
          <h2 className={styles.columnTitle}>Atendimento</h2>

          <div className={styles.contactList}>
            {supportWhatsApp && supportPhoneLabel && (
              <a
                href={`https://wa.me/${supportWhatsApp}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.contactItem}
              >
                <MessageCircle
                  size={18}
                  className={styles.contactIcon}
                  aria-hidden="true"
                />
                <span>{supportPhoneLabel}</span>
              </a>
            )}

            {supportEmail && (
              <a
                href={`mailto:${supportEmail}`}
                className={`${styles.contactItem} ${styles.emailLink}`}
              >
                <Mail
                  size={18}
                  className={styles.contactIcon}
                  aria-hidden="true"
                />
                <span>{supportEmail}</span>
              </a>
            )}

            <div className={styles.contactItem}>
              <Clock
                size={18}
                className={styles.contactIcon}
                aria-hidden="true"
              />

              <span>
                Segunda a sexta: 8h às 18h
                <br />
                Sábado: 8h às 12h
              </span>
            </div>

            {!supportEmail && !supportPhoneLabel && (
              <Link href="/contato" className={styles.highlightLink}>
                Acessar central de atendimento
              </Link>
            )}
          </div>
        </div>

        <div className={styles.column}>
          <h2 className={styles.columnTitle}>Formas de pagamento</h2>

          <div className={styles.paymentGrid}>
            {paymentMethods.map((method) => (
              <span
                key={method.name}
                className={styles.paymentBadge}
                title={method.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${PAYMENT_LOGO_BASE_URL}/${method.file}`}
                  alt={method.name}
                  loading="lazy"
                  className={styles.paymentLogo}
                />
              </span>
            ))}
          </div>

          <Link href="/formas-de-pagamento" className={styles.highlightLink}>
            Consulte as condições
          </Link>

          <h2 className={`${styles.columnTitle} ${styles.securityTitle}`}>
            Segurança
          </h2>

          <div className={styles.securityList}>
            <span className={styles.securityItem}>
              <LockKeyhole size={17} aria-hidden="true" />
              Conexão protegida por HTTPS
            </span>

            <span className={styles.securityItem}>
              <ShieldCheck size={17} aria-hidden="true" />
              Pagamento processado em ambiente seguro
            </span>
          </div>
        </div>
      </div>

      <div className={styles.bottomArea}>
        <div className={styles.bottomContainer}>
          <span>© {currentYear} Laico. Todos os direitos reservados.</span>

          <nav
            aria-label="Links legais e de atendimento"
            className={styles.legalNavigation}
          >
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={styles.legalLink}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {supplierIdentification && (
          <div className={styles.supplierIdentification}>
            {supplierIdentification}
          </div>
        )}
      </div>
    </footer>
  );
}

function FooterLinkColumn({
  title,
  links,
}: {
  title: string;
  links: readonly {
    label: string;
    href: string;
  }[];
}) {
  return (
    <div className={styles.column}>
      <h2 className={styles.columnTitle}>{title}</h2>

      <nav aria-label={title}>
        <ul className={styles.linkList}>
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={styles.footerLink}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.7 21v-8h2.8l.42-3.18H13.7V7.8c0-.92.27-1.55 1.61-1.55H17V3.42c-.29-.04-1.3-.12-2.47-.12-2.45 0-4.13 1.45-4.13 4.12v2.4H7.63V13h2.77v8h3.3Z" />
    </svg>
  );
}

function YouTubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        fill="currentColor"
        d="M21.58 7.19a2.98 2.98 0 0 0-2.1-2.11C17.63 4.58 12 4.58 12 4.58s-5.63 0-7.48.5a2.98 2.98 0 0 0-2.1 2.11A31.1 31.1 0 0 0 1.92 12c0 1.62.17 3.23.5 4.81a2.98 2.98 0 0 0 2.1 2.11c1.85.5 7.48.5 7.48.5s5.63 0 7.48-.5a2.98 2.98 0 0 0 2.1-2.11c.33-1.58.5-3.19.5-4.81s-.17-3.23-.5-4.81Z"
      />
      <path fill="#020617" d="m10 15.5 5-3.5-5-3.5v7Z" />
    </svg>
  );
}
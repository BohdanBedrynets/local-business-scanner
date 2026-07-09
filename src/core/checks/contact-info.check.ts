import type { Page } from "playwright";

export type ContactInfoCheckResult = {
  emailsCount: number;
  phonesCount: number;
  socialLinksCount: number;
  emails: string[];
  phones: string[];
  socialLinks: string[];
};

export async function checkContactInfo(
  page: Page
): Promise<ContactInfoCheckResult> {
  const result = await page.evaluate(() => {
    const text = document.body.innerText;

    const hrefs = Array.from(document.querySelectorAll("a"))
      .map((anchor) => anchor.getAttribute("href"))
      .filter((href): href is string => Boolean(href));

    const emailsFromText =
      text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];

    const emailsFromLinks = hrefs
      .filter((href) => href.startsWith("mailto:"))
      .map((href) => href.replace("mailto:", "").split("?")[0]);

    const phonesFromLinks = hrefs
      .filter((href) => href.startsWith("tel:"))
      .map((href) => href.replace("tel:", ""));

    const socialLinks = hrefs.filter((href) =>
      ["instagram.com", "facebook.com", "wa.me", "whatsapp.com"].some((domain) =>
        href.includes(domain)
      )
    );

    return {
      emails: Array.from(new Set([...emailsFromText, ...emailsFromLinks])),
      phones: Array.from(new Set(phonesFromLinks)),
      socialLinks: Array.from(new Set(socialLinks)),
    };
  });

  return {
    emailsCount: result.emails.length,
    phonesCount: result.phones.length,
    socialLinksCount: result.socialLinks.length,
    emails: result.emails,
    phones: result.phones,
    socialLinks: result.socialLinks,
  };
}
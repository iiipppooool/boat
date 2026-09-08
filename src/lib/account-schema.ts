import { z } from "zod";

/**
 * Registration and sign-in contracts, shared by the forms and the routes.
 *
 * The password rule is a length floor and nothing else. Character-class rules
 * ("one capital, one symbol") are known to push people towards `Password1!`
 * and to be worse than length; NCSC and NIST both stopped recommending them.
 * Twelve characters, and we say why on the form.
 */
export const RegisterSchema = z.object({
  email: z.email("That does not look like an email address.").max(180),
  password: z
    .string()
    .min(12, "Twelve characters or more, please — length beats punctuation.")
    .max(200),
  name: z.string().trim().min(2, "We need something to call you or your club.").max(90),
  /** Joins the waiting list at the same time. Defaults on, and says so. */
  joinWaitlist: z.boolean().optional().default(true),
  country: z.string().trim().max(80).optional().default(""),
  website: z.string().max(200).optional().default(""), // honeypot
});

export const SignInSchema = z.object({
  email: z.email("That does not look like an email address.").max(180),
  password: z.string().min(1, "Enter your password.").max(200),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type SignInInput = z.infer<typeof SignInSchema>;

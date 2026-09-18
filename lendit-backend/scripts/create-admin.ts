import "dotenv/config";
import mongoose from "mongoose";
import { AccountModel, Role } from "../src/models/account.model";
import { hashPassword } from "../src/utils/password";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function ask(
  question: string,
  validate: (value: string) => string | null,
): string | null {
  while (true) {
    const answer = prompt(question);

    if (answer === null) return null;

    const trimmed = answer.trim();
    const error = validate(trimmed);
    if (!error) return trimmed;
    console.log(`  ${error}`);
  }
}

async function askHidden(question: string): Promise<string | null> {
  const stdin = process.stdin;

  if (!stdin.isTTY) return prompt(question);

  process.stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  return new Promise((resolve) => {
    let value = "";
    const onData = (chunk: string) => {
      for (const char of chunk) {
        switch (char) {

          case "\n":
          case "\r":
            cleanup();
            process.stdout.write("\n");
            return resolve(value);

          case "":
            cleanup();
            process.stdout.write("\n");
            process.exit(130);

          case "":
            cleanup();
            process.stdout.write("\n");
            return resolve(null as unknown as string);

          case "":
          case "":
            value = value.slice(0, -1);
            break;
          default:

            if (char >= " ") value += char;
        }
      }
    };

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
    };

    stdin.on("data", onData);
  });
}

async function createAdmin() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  console.log("Create the first admin account\n");

  const email = ask("Email: ", (value) => {
    if (!value) return "email is required";
    if (!EMAIL_PATTERN.test(value)) return "email must be valid";
    return null;
  });
  if (email === null) return console.log("\nCancelled.");
  const normalizedEmail = email.toLowerCase();

  await mongoose.connect(uri);
  if (await AccountModel.exists({ email: normalizedEmail })) {
    console.log(`\nAn account with ${normalizedEmail} already exists.`);
    return;
  }

  const firstName = ask("First name [Super]: ", () => null) || "Super";
  const lastName = ask("Last name [Admin]: ", () => null) || "Admin";

  let password: string;
  while (true) {
    const first = await askHidden(
      `Password (min ${MIN_PASSWORD_LENGTH} chars): `,
    );
    if (first === null) return console.log("\nCancelled.");
    if (first.length < MIN_PASSWORD_LENGTH) {
      console.log(
        `  password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      );
      continue;
    }

    const confirm = await askHidden("Confirm password: ");
    if (confirm === null) return console.log("\nCancelled.");
    if (first !== confirm) {
      console.log("  passwords do not match");
      continue;
    }

    password = first;
    break;
  }

  const admin = await AccountModel.create({
    firstName,
    lastName,
    email: normalizedEmail,
    password: await hashPassword(password),
    role: Role.Admin,
    isActive: true,
  });

  console.log(
    `\nAdmin account created: ${normalizedEmail} (id ${String(admin._id)})`,
  );
}

try {
  await createAdmin();
} catch (error) {
  console.error("Create admin failed", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

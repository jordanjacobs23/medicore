import { prisma } from "../lib/prisma";

const practice  = await prisma.practice.upsert({
  where: {
    clerkOrgId: "org_3LZ2ZACJvE0rS9JNTnU5AMZ7Ga",
  },
  create: {
    clerkOrgId: "org_3LZ2ZACJvE0rS9JNTnU5AMZ7Ga",
    name: "MediCore",
  },
  update: {
    name: "MediCore",
  },
});
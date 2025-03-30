import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Clear existing data
  await prisma.message.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const password = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      password
    }
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      password
    }
  });

  const charlie = await prisma.user.create({
    data: {
      email: 'charlie@example.com',
      password
    }
  });

  console.log('Created users:', { alice, bob, charlie });

  // Create a 1:1 conversation
  const privateConversation = await prisma.conversation.create({
    data: {
      isGroup: false,
      participants: {
        create: [
          { userId: alice.id },
          { userId: bob.id }
        ]
      }
    }
  });

  // Create a group conversation
  const groupConversation = await prisma.conversation.create({
    data: {
      isGroup: true,
      groupName: 'Team Chat',
      participants: {
        create: [
          { userId: alice.id },
          { userId: bob.id },
          { userId: charlie.id }
        ]
      }
    }
  });

  console.log('Created conversations:', { privateConversation, groupConversation });

  // Add messages to private conversation
  const privateMessages = await Promise.all([
    prisma.message.create({
      data: {
        content: 'Hey Bob, how are you?',
        senderId: alice.id,
        conversationId: privateConversation.id
      }
    }),
    prisma.message.create({
      data: {
        content: 'I\'m good Alice, thanks for asking!',
        senderId: bob.id,
        conversationId: privateConversation.id
      }
    }),
    prisma.message.create({
      data: {
        content: 'What are you working on today?',
        senderId: alice.id,
        conversationId: privateConversation.id
      }
    })
  ]);

  // Add messages to group conversation
  const groupMessages = await Promise.all([
    prisma.message.create({
      data: {
        content: 'Welcome to the team chat everyone!',
        senderId: alice.id,
        conversationId: groupConversation.id
      }
    }),
    prisma.message.create({
      data: {
        content: 'Thanks for setting this up Alice',
        senderId: bob.id,
        conversationId: groupConversation.id
      }
    }),
    prisma.message.create({
      data: {
        content: 'Hello everyone, excited to be here!',
        senderId: charlie.id,
        conversationId: groupConversation.id
      }
    })
  ]);

  console.log(`Created ${privateMessages.length} private messages`);
  console.log(`Created ${groupMessages.length} group messages`);

  console.log('Seeding completed successfully');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testMentions() {
  try {
    console.log('🔍 Testing mention detection and user matching...\n');
    
    // Test comment content
    const commentContent = '@User_02 testing please get notified';
    console.log(`Comment content: "${commentContent}"\n`);
    
    // Extract mentions
    const mentionRegex = /@([^\s,@]+)/g;
    const mentions = [];
    let match;
    mentionRegex.lastIndex = 0;
    
    while ((match = mentionRegex.exec(commentContent)) !== null) {
      const mentionedText = match[1].trim();
      if (mentionedText) {
        mentions.push(mentionedText);
      }
    }
    
    console.log(`📝 Mentions extracted:`, mentions);
    
    // Get all users
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
    
    console.log(`\n👥 All users in database (${allUsers.length}):`);
    allUsers.forEach((user, idx) => {
      console.log(`  ${idx + 1}. ${user.name || 'No name'} (${user.email}) - ID: ${user.id}`);
    });
    
    // Test matching
    const normalizeForMatching = (text) => {
      return text.toLowerCase().replace(/[\s_\-]/g, '');
    };
    
    console.log(`\n🔍 Testing matches for mentions...`);
    for (const mention of mentions) {
      const mentionLower = mention.toLowerCase().trim();
      console.log(`\n  Testing mention: "${mention}" (lowercase: "${mentionLower}")`);
      
      const matchedUsers = [];
      
      for (const user of allUsers) {
        const userName = (user.name || "").trim().toLowerCase();
        const userEmail = user.email.trim().toLowerCase();
        const normalizedMention = normalizeForMatching(mention);
        const normalizedUserName = normalizeForMatching(userName);
        const normalizedEmail = normalizeForMatching(userEmail);
        
        let matched = false;
        let matchReason = '';
        
        // 1. Exact match for name
        if (userName && userName === mentionLower) {
          matched = true;
          matchReason = 'exact name match';
        }
        // 2. Normalized name match
        else if (userName && normalizedMention === normalizedUserName) {
          matched = true;
          matchReason = 'normalized name match';
        }
        // 3. Partial match on normalized name
        else if (userName && (normalizedUserName.includes(normalizedMention) || normalizedMention.includes(normalizedUserName))) {
          matched = true;
          matchReason = 'partial normalized name match';
        }
        // 4. Exact email match
        else if (userEmail === mentionLower) {
          matched = true;
          matchReason = 'exact email match';
        }
        // 5. Email username match
        else if (userEmail.split('@')[0] === mentionLower) {
          matched = true;
          matchReason = 'email username match';
        }
        
        if (matched) {
          matchedUsers.push({ user, matchReason });
        }
      }
      
      if (matchedUsers.length > 0) {
        console.log(`  ✅ Matched ${matchedUsers.length} user(s):`);
        matchedUsers.forEach(({ user, matchReason }) => {
          console.log(`     - ${user.name || user.email} (${user.id}) - ${matchReason}`);
        });
      } else {
        console.log(`  ❌ No matches found`);
      }
    }
    
    // Check notifications
    console.log(`\n🔔 Checking existing notifications...`);
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
    
    console.log(`Found ${notifications.length} recent notifications:`);
    notifications.forEach((notif, idx) => {
      console.log(`  ${idx + 1}. [${notif.type}] ${notif.message.substring(0, 60)}...`);
      console.log(`     To: ${notif.user.name || notif.user.email} (${notif.userId})`);
      console.log(`     Read: ${notif.isRead}, Created: ${notif.createdAt}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMentions();


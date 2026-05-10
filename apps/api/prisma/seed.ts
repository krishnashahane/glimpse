import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const users = await Promise.all(
    [
      { username: 'krishna_s', handle: 'krishna_s', email: 'krishna@glimpse.io' },
      { username: 'alex_dev', handle: 'alex_dev', email: 'alex@glimpse.io' },
      { username: 'sam_labs', handle: 'sam_labs', email: 'sam@glimpse.io' },
      { username: 'priya_k', handle: 'priya_k', email: 'priya@glimpse.io' },
      { username: 'james_w', handle: 'james_w', email: 'james@glimpse.io' },
    ].map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          ...u,
          passwordHash: bcrypt.hashSync('password123', 10),
          bio: `${u.username} is a curious human on Glimpse.`,
          isVerified: u.handle === 'krishna_s',
        },
      }),
    ),
  )

  console.log(`Created ${users.length} users`)

  const communities = await Promise.all(
    [
      { name: 'Technology', slug: 'technology', description: 'All things tech, AI, and software.' },
      { name: 'Science', slug: 'science', description: 'Research, discoveries, and the cosmos.' },
      { name: 'World News', slug: 'world-news', description: 'Global happenings, curated daily.' },
      { name: 'Programming', slug: 'programming', description: 'Code, open source, and dev culture.' },
      { name: 'Design', slug: 'design', description: 'UI/UX, visual culture, and creative tech.' },
      { name: 'Finance', slug: 'finance', description: 'Markets, crypto, and economic commentary.' },
    ].map((c) =>
      prisma.community.upsert({
        where: { slug: c.slug },
        update: {},
        create: { ...c, memberCount: Math.floor(Math.random() * 10000) + 500 },
      }),
    ),
  )

  console.log(`Created ${communities.length} communities`)

  const techTag = await prisma.tag.upsert({ where: { slug: 'tech' }, update: {}, create: { name: 'tech', slug: 'tech' } })
  const aiTag = await prisma.tag.upsert({ where: { slug: 'ai' }, update: {}, create: { name: 'AI', slug: 'ai' } })
  const cryptoTag = await prisma.tag.upsert({ where: { slug: 'crypto' }, update: {}, create: { name: 'crypto', slug: 'crypto' } })

  const postSeeds = [
    { content: 'The next wave of AI isn\'t about smarter models — it\'s about models that know when to stop and ask for help. Human-in-the-loop at scale.', authorIndex: 0, communityIndex: 0 },
    { content: 'Researchers at Stanford just published a paper claiming they\'ve achieved room-temperature superconductivity. If reproducible, this changes everything from power grids to maglev transport.', authorIndex: 1, communityIndex: 1 },
    { content: 'Hot take: TypeScript strict mode should be the default, not opt-in. The number of bugs I\'ve seen from unchecked any types is embarrassing.', authorIndex: 2, communityIndex: 3 },
    { content: 'Design systems are not about consistency. They\'re about freeing designers to focus on hard problems instead of reinventing buttons. Figma\'s latest variables feature finally makes this seamless.', authorIndex: 3, communityIndex: 4 },
    { content: 'The Glimpse algorithm sees what you engage with, not just what you like. Doomscrolling past something still teaches it what you fear. Lurking has consequences.', authorIndex: 4, communityIndex: 0 },
    { content: 'Central banks are now actively studying crypto settlement mechanisms. The irony of blockchain being adopted by the institutions it was built to disrupt.', authorIndex: 0, communityIndex: 5 },
    { content: 'Rust just overtook Go in the TIOBE index for systems programming. Memory safety without GC is finally mainstream. 2026 is the year of Rust in production.', authorIndex: 1, communityIndex: 3 },
    { content: 'The problem with infinite scroll is it removes natural stopping points. Every good UX needs friction at the right places. Friction = intention.', authorIndex: 3, communityIndex: 4 },
  ]

  const posts = await Promise.all(
    postSeeds.map((seed, i) =>
      prisma.post.create({
        data: {
          content: seed.content,
          authorId: users[seed.authorIndex].id,
          communityId: communities[seed.communityIndex].id,
          upvotes: Math.floor(Math.random() * 500) + 10,
          score: Math.floor(Math.random() * 1000),
          commentCount: Math.floor(Math.random() * 50),
        },
      }),
    ),
  )

  // Tag first few posts
  await prisma.postTag.createMany({
    data: [
      { postId: posts[0].id, tagId: aiTag.id },
      { postId: posts[0].id, tagId: techTag.id },
      { postId: posts[2].id, tagId: techTag.id },
      { postId: posts[5].id, tagId: cryptoTag.id },
    ],
    skipDuplicates: true,
  })

  // Add some comments
  await Promise.all([
    prisma.post.create({
      data: {
        content: 'This is exactly what I\'ve been thinking. The o3 model refusing to answer certain questions is the first real example of this at scale.',
        authorId: users[1].id,
        parentId: posts[0].id,
        upvotes: 45,
        score: 45,
      },
    }),
    prisma.post.create({
      data: {
        content: 'Agreed, but who decides when to ask? That meta-cognition is the hard part.',
        authorId: users[2].id,
        parentId: posts[0].id,
        upvotes: 23,
        score: 23,
      },
    }),
  ])

  // Follows
  await Promise.all([
    prisma.follow.upsert({
      where: { followerId_followingId: { followerId: users[0].id, followingId: users[1].id } },
      update: {},
      create: { followerId: users[0].id, followingId: users[1].id },
    }),
    prisma.follow.upsert({
      where: { followerId_followingId: { followerId: users[1].id, followingId: users[0].id } },
      update: {},
      create: { followerId: users[1].id, followingId: users[0].id },
    }),
  ])

  // Community memberships
  for (const user of users) {
    for (const community of communities.slice(0, 3)) {
      await prisma.communityMember.upsert({
        where: { userId_communityId: { userId: user.id, communityId: community.id } },
        update: {},
        create: { userId: user.id, communityId: community.id },
      })
    }
  }

  console.log('Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

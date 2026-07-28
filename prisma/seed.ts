import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcrypt';

async function main() {
  // Reset — Board delete cascades to columns/tasks/subtasks/comments/assignees/members/activityLog
  await prisma.board.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const [alice, bob, carol, dave, eve] = await Promise.all([
    prisma.user.create({ data: { username: 'alice', email: 'alice@example.com', passwordHash, nickname: 'Alice' } }),
    prisma.user.create({ data: { username: 'bob', email: 'bob@example.com', passwordHash, nickname: 'Bob' } }),
    prisma.user.create({ data: { username: 'carol', email: 'carol@example.com', passwordHash } }),
    prisma.user.create({ data: { username: 'dave', email: 'dave@example.com', passwordHash } }),
    prisma.user.create({ data: { username: 'eve', email: 'eve@example.com', passwordHash } }),
  ]);

  const inDays = (n: number) => new Date(Date.now() + n * 86_400_000);

  // ── Board 1: Product Launch ──────────────────────────────
  const board1 = await prisma.board.create({
    data: { name: 'Product Launch', description: 'Coordinating the Q3 product launch', createdById: alice.id },
  });

  await prisma.boardMember.createMany({
    data: [
      { userID: alice.id, boardID: board1.id, role: 'OWNER' },
      { userID: bob.id, boardID: board1.id, role: 'ADMIN' },
      { userID: carol.id, boardID: board1.id, role: 'MEMBER' },
      { userID: dave.id, boardID: board1.id, role: 'VIEWER' },
    ],
  });

  const b1Backlog = await prisma.column.create({ data: { title: 'Backlog', order: 1000, boardID: board1.id, createdById: alice.id } });
  const b1InProgress = await prisma.column.create({ data: { title: 'In Progress', order: 2000, boardID: board1.id, createdById: alice.id } });
  const b1Done = await prisma.column.create({ data: { title: 'Done', order: 3000, boardID: board1.id, createdById: alice.id } });

  const t1 = await prisma.task.create({
    data: {
      title: 'Design landing page hero section',
      description: 'Create a compelling hero section for the new product landing page, highlighting key value props.',
      priority: 'MEDIUM',
      dueDate: inDays(7),
      order: 1000,
      columnID: b1Backlog.id,
      boardID: board1.id,
      createdById: alice.id,
    },
  });
  await prisma.taskAssignee.create({ data: { taskID: t1.id, userID: bob.id } });
  await prisma.subtask.createMany({
    data: [
      { title: 'Draft wireframe', isCompleted: true, taskID: t1.id, createdByID: alice.id },
      { title: 'Get design review', isCompleted: false, taskID: t1.id, createdByID: alice.id },
    ],
  });
  await prisma.comment.createMany({
    data: [
      { content: "I'll have the wireframe ready by Thursday.", taskID: t1.id, userID: bob.id },
      { content: 'Sounds good, thanks!', taskID: t1.id, userID: alice.id },
    ],
  });

  const t2 = await prisma.task.create({
    data: {
      title: 'Write launch announcement blog post',
      description: 'Draft the blog post announcing the product launch, including screenshots and pricing details.',
      priority: 'HIGH',
      dueDate: inDays(3),
      order: 2000,
      columnID: b1Backlog.id,
      boardID: board1.id,
      createdById: bob.id,
    },
  });
  await prisma.taskAssignee.create({ data: { taskID: t2.id, userID: carol.id } });
  await prisma.subtask.create({ data: { title: 'Outline structure', isCompleted: true, taskID: t2.id, createdByID: bob.id } });

  // Bare task — no description, no subtasks — good for testing AI generation from empty state
  await prisma.task.create({
    data: {
      title: 'Set up analytics tracking',
      priority: 'LOW',
      order: 3000,
      columnID: b1Backlog.id,
      boardID: board1.id,
      createdById: carol.id,
    },
  });

  const t4 = await prisma.task.create({
    data: {
      title: 'Build pricing page',
      description: 'Implement the new pricing page with tiered plans and FAQ section.',
      priority: 'HIGH',
      dueDate: inDays(2),
      order: 1000,
      columnID: b1InProgress.id,
      boardID: board1.id,
      createdById: alice.id,
    },
  });
  await prisma.taskAssignee.createMany({ data: [{ taskID: t4.id, userID: alice.id }, { taskID: t4.id, userID: bob.id }] });
  await prisma.subtask.createMany({
    data: [
      { title: 'Implement UI', isCompleted: false, taskID: t4.id, createdByID: alice.id },
      { title: 'Wire up Stripe', isCompleted: false, taskID: t4.id, createdByID: alice.id },
    ],
  });
  await prisma.comment.create({ data: { content: 'Should we support annual billing at launch or just monthly?', taskID: t4.id, userID: bob.id } });

  const t5 = await prisma.task.create({
    data: {
      title: 'QA landing page across browsers',
      description: 'Test landing page rendering and interactions on Chrome, Firefox, Safari, and mobile.',
      priority: 'MEDIUM',
      order: 2000,
      columnID: b1InProgress.id,
      boardID: board1.id,
      createdById: bob.id,
    },
  });
  await prisma.taskAssignee.create({ data: { taskID: t5.id, userID: carol.id } });

  const t6 = await prisma.task.create({
    data: {
      title: 'Finalize brand guidelines',
      description: 'Complete brand guideline document with logo usage, color palette, and typography rules.',
      priority: 'MEDIUM',
      order: 1000,
      columnID: b1Done.id,
      boardID: board1.id,
      createdById: alice.id,
    },
  });
  await prisma.taskAssignee.create({ data: { taskID: t6.id, userID: alice.id } });
  await prisma.subtask.createMany({
    data: [
      { title: 'Draft doc', isCompleted: true, taskID: t6.id, createdByID: alice.id },
      { title: 'Get sign-off', isCompleted: true, taskID: t6.id, createdByID: alice.id },
    ],
  });
  await prisma.activityLog.createMany({
  data: [
    // Board setup
    {
      boardID: board1.id,
      userID: alice.id,
      actorUsername: "alice",
      action: "BOARD_CREATED",
      entityType: "BOARD",
      entityID: board1.id,
      entityTitle: board1.name,
    },

    // Columns
    {
      boardID: board1.id,
      userID: alice.id,
      actorUsername: "alice",
      action: "COLUMN_CREATED",
      entityType: "COLUMN",
      entityID: b1Backlog.id,
      entityTitle: b1Backlog.title,
    },
    {
      boardID: board1.id,
      userID: alice.id,
      actorUsername: "alice",
      action: "COLUMN_CREATED",
      entityType: "COLUMN",
      entityID: b1InProgress.id,
      entityTitle: b1InProgress.title,
    },
    {
      boardID: board1.id,
      userID: alice.id,
      actorUsername: "alice",
      action: "COLUMN_CREATED",
      entityType: "COLUMN",
      entityID: b1Done.id,
      entityTitle: b1Done.title,
    },

    // Tasks
    {
      boardID: board1.id,
      userID: alice.id,
      actorUsername: "alice",
      action: "TASK_CREATED",
      entityType: "TASK",
      entityID: t1.id,
      entityTitle: t1.title,
    },
    {
      boardID: board1.id,
      userID: bob.id,
      actorUsername: "bob",
      action: "TASK_ASSIGNED",
      entityType: "TASK",
      entityID: t1.id,
      entityTitle: t1.title,
    },
    {
      boardID: board1.id,
      userID: bob.id,
      actorUsername: "bob",
      action: "COMMENT_ADDED",
      entityType: "TASK",
      entityID: t1.id,
      entityTitle: t1.title,
    },

    {
      boardID: board1.id,
      userID: bob.id,
      actorUsername: "bob",
      action: "TASK_CREATED",
      entityType: "TASK",
      entityID: t2.id,
      entityTitle: t2.title,
    },

    {
      boardID: board1.id,
      userID: alice.id,
      actorUsername: "alice",
      action: "TASK_CREATED",
      entityType: "TASK",
      entityID: t4.id,
      entityTitle: t4.title,
    },

    {
      boardID: board1.id,
      userID: bob.id,
      actorUsername: "bob",
      action: "COMMENT_ADDED",
      entityType: "TASK",
      entityID: t4.id,
      entityTitle: t4.title,
    },

    {
      boardID: board1.id,
      userID: bob.id,
      actorUsername: "bob",
      action: "TASK_CREATED",
      entityType: "TASK",
      entityID: t5.id,
      entityTitle: t5.title,
    },

    {
      boardID: board1.id,
      userID: alice.id,
      actorUsername: "alice",
      action: "TASK_CREATED",
      entityType: "TASK",
      entityID: t6.id,
      entityTitle: t6.title,
    },

    {
      boardID: board1.id,
      userID: alice.id,
      actorUsername: "alice",
      action: "TASK_MOVED",
      entityType: "TASK",
      entityID: t6.id,
      entityTitle: t6.title,
    },

    {
      boardID: board1.id,
      userID: alice.id,
      actorUsername: "alice",
      action: "SUBTASK_COMPLETED",
      entityType: "TASK",
      entityID: t6.id,
      entityTitle: t6.title,
    },
  ],
});

  // ── Board 2: Website Redesign — role mix flipped, tests per-board role resolution ──
  const board2 = await prisma.board.create({
    data: { name: 'Website Redesign', description: 'Full redesign of the marketing site', createdById: bob.id },
  });

  await prisma.boardMember.createMany({
    data: [
      { userID: bob.id, boardID: board2.id, role: 'OWNER' },
      { userID: alice.id, boardID: board2.id, role: 'ADMIN' },
      { userID: eve.id, boardID: board2.id, role: 'MEMBER' },
      { userID: carol.id, boardID: board2.id, role: 'VIEWER' },
    ],
  });

  const b2Todo = await prisma.column.create({ data: { title: 'To Do', order: 1000, boardID: board2.id, createdById: bob.id } });
  const b2Review = await prisma.column.create({ data: { title: 'In Review', order: 2000, boardID: board2.id, createdById: bob.id } });
  const b2Shipped = await prisma.column.create({ data: { title: 'Shipped', order: 3000, boardID: board2.id, createdById: bob.id } });

  const t7 = await prisma.task.create({
    data: {
      title: 'Audit current site information architecture',
      description: 'Review existing site map and identify pages that need restructuring.',
      priority: 'MEDIUM',
      order: 1000,
      columnID: b2Todo.id,
      boardID: board2.id,
      createdById: bob.id,
    },
  });
  await prisma.taskAssignee.create({ data: { taskID: t7.id, userID: alice.id } });
  await prisma.subtask.create({ data: { title: 'List all current pages', isCompleted: true, taskID: t7.id, createdByID: bob.id } });
  await prisma.comment.create({ data: { content: 'Should I include the /legal pages in this audit?', taskID: t7.id, userID: eve.id } });

  await prisma.task.create({
    data: {
      title: 'Competitive analysis of 3 competitor sites',
      description: 'Analyze navigation, messaging, and conversion flows of three competitor websites.',
      priority: 'LOW',
      order: 2000,
      columnID: b2Todo.id,
      boardID: board2.id,
      createdById: eve.id,
    },
  });

  const t9 = await prisma.task.create({
    data: {
      title: 'New homepage design mockup',
      description: 'High-fidelity mockup for the redesigned homepage in Figma.',
      priority: 'HIGH',
      dueDate: inDays(5),
      order: 1000,
      columnID: b2Review.id,
      boardID: board2.id,
      createdById: alice.id,
    },
  });
  await prisma.taskAssignee.create({ data: { taskID: t9.id, userID: eve.id } });
  await prisma.subtask.createMany({
    data: [
      { title: 'Create mobile version', isCompleted: false, taskID: t9.id, createdByID: alice.id },
      { title: 'Create desktop version', isCompleted: true, taskID: t9.id, createdByID: alice.id },
    ],
  });

  const t10 = await prisma.task.create({
    data: {
      title: 'Migrate blog to new CMS',
      description: 'Move all blog content from old system to new headless CMS.',
      priority: 'MEDIUM',
      order: 1000,
      columnID: b2Shipped.id,
      boardID: board2.id,
      createdById: bob.id,
    },
  });
  await prisma.taskAssignee.create({ data: { taskID: t10.id, userID: bob.id } });
  await prisma.subtask.createMany({
    data: [
      { title: 'Export old content', isCompleted: true, taskID: t10.id, createdByID: bob.id },
      { title: 'Import to new CMS', isCompleted: true, taskID: t10.id, createdByID: bob.id },
    ],
  });

  console.log('Seed complete.');
  console.log('Login with any of: alice / bob / carol / dave / eve — password: Password123!');
  console.log(`Board 1 "Product Launch": alice=OWNER, bob=ADMIN, carol=MEMBER, dave=VIEWER`);
  console.log(`Board 2 "Website Redesign": bob=OWNER, alice=ADMIN, eve=MEMBER, carol=VIEWER`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
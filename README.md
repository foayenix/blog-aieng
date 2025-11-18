# AI Engineering Commons

A community-driven knowledge hub for AI/ML engineering content. This platform enables collaborative creation, curation, and governance of technical articles through a reputation-based system with multiple user roles.

## Features

### Content Management
- **Article Creation & Editing** - Create and edit articles using MDX (Markdown with JSX support)
- **Version Control** - Full version history for all articles with changelog tracking
- **Categories** - Organized content across Foundations, Systems, Applied, MLOps, Safety, Benchmarks, Case Studies, and Career
- **Tagging System** - Flexible tagging for improved discoverability
- **Citations** - Articles can cite other articles, building a knowledge graph

### Governance System
- **Role-Based Access Control** - Five-tier role system with increasing privileges
- **Weighted Voting** - Votes carry different weights based on user roles
- **Reputation System** - Earn reputation through contributions and community recognition
- **Automatic Promotions** - Users are promoted based on reputation thresholds
- **Moderation Tools** - Comprehensive tools for content review and approval

### Community Features
- **Discussion Threads** - Each article has an associated discussion thread
- **Nested Comments** - Support for threaded conversations with replies
- **User Profiles** - Detailed profiles with badges, activity history, and reputation
- **Badges** - Recognition system for achievements and contributions

### Admin Capabilities
- **User Management** - Manage user roles and permissions
- **Badge System** - Create and award badges to users
- **Activity Logs** - Track all moderation actions and system events
- **Platform Statistics** - Dashboard with key metrics

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Authentication**: NextAuth.js with GitHub OAuth and email/password
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Content**: MDX (next-mdx-remote)

## Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **PostgreSQL** database (local or hosted)
- **GitHub OAuth App** (optional, for social login)

### Installation

1. **Clone and install dependencies**

```bash
git clone <repository-url>
cd blog-aieng
npm install
```

2. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your values:
- `DATABASE_URL` - Your PostgreSQL connection string
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `GITHUB_ID` / `GITHUB_SECRET` - From your GitHub OAuth app (optional)
- `MAINTAINER_EMAILS` - Comma-separated list of admin emails

3. **Set up the database**

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# OR use migrations (production)
npx prisma migrate dev
```

4. **Seed the database (optional)**

```bash
npx prisma db seed
```

5. **Run the development server**

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

### GitHub OAuth Setup (Optional)

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Set:
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy the Client ID and Client Secret to your `.env` file

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── admin/         # Admin endpoints (users, badges, logs, stats)
│   │   ├── articles/      # Article CRUD and versions
│   │   ├── auth/          # Authentication endpoints
│   │   ├── moderation/    # Approval/rejection workflows
│   │   ├── threads/       # Discussion threads and comments
│   │   └── votes/         # Voting endpoints
│   ├── admin/             # Admin dashboard pages
│   ├── articles/          # Article pages (list, view, create, edit)
│   ├── auth/              # Authentication pages
│   ├── moderation/        # Moderation dashboard
│   └── profile/           # User profile pages
├── components/            # React components
│   ├── articles/          # Article-related components
│   ├── layout/            # Layout components (header, sidebar, footer)
│   ├── moderation/        # Moderation UI components
│   ├── profile/           # Profile components
│   └── ui/                # shadcn/ui base components
├── hooks/                 # Custom React hooks
├── lib/                   # Core libraries and utilities
│   ├── auth.ts           # NextAuth configuration
│   ├── governance.ts     # Role weights and thresholds
│   ├── permissions.ts    # Permission checking functions
│   ├── prisma.ts         # Prisma client instance
│   ├── rate-limit.ts     # Rate limiting utilities
│   ├── reputation.ts     # Reputation management
│   └── voting.ts         # Voting logic
└── types/                 # TypeScript type definitions
```

## Governance System

### Roles and Weights

The platform uses a five-tier role system with weighted voting:

| Role | Weight | Description |
|------|--------|-------------|
| **READER** | 1 | Default role, can read and vote |
| **CONTRIBUTOR** | 2 | Can create new articles |
| **REVIEWER** | 4 | Can approve articles and access moderation tools |
| **JUDGE** | 8 | Can force approve/reject and delete articles |
| **MAINTAINER** | 16 | Full admin access, manage users and system |

### Permissions by Role

| Permission | Reader | Contributor | Reviewer | Judge | Maintainer |
|------------|--------|-------------|----------|-------|------------|
| Read articles | Yes | Yes | Yes | Yes | Yes |
| Vote on articles | Yes | Yes | Yes | Yes | Yes |
| Comment | Yes | Yes | Yes | Yes | Yes |
| Create articles | No | Yes | Yes | Yes | Yes |
| Edit own articles | No | Yes | Yes | Yes | Yes |
| Edit any article | No | No | Yes | Yes | Yes |
| Approve articles | No | No | Yes | Yes | Yes |
| Force approve/reject | No | No | No | Yes | Yes |
| Delete articles | No | No | No | Yes | Yes |
| Access admin panel | No | No | No | No | Yes |
| Manage users | No | No | No | No | Yes |

### Reputation System

Users earn reputation points through various activities:

| Event | Points |
|-------|--------|
| Article merged | +3 |
| Substantial merge | +8 |
| Article cited | +1 |
| Upvote received | +1 |
| Badge earned | +5 |
| Promoted | +10 |
| Article reverted | -5 |

### Automatic Promotions

Users are automatically promoted when reaching these reputation thresholds:

| Role | Required Reputation |
|------|-------------------|
| CONTRIBUTOR | 10 |
| REVIEWER | 50 |
| JUDGE | 200 |

**Note**: MAINTAINER role is not automatically granted and must be assigned manually.

### Article Approval Thresholds

For an article to be automatically approved and published:

- **Required weighted score**: 24 points
- **Required REVIEWER+ approvals**: 2
- **Required JUDGE+ approvals**: 1

JUDGE and MAINTAINER roles can force approve articles to bypass these requirements.

## API Endpoints

### Authentication
- `GET/POST /api/auth/[...nextauth]` - NextAuth.js handlers
- `POST /api/auth/register` - Email/password registration

### Articles
- `GET /api/articles` - List articles (with filtering)
- `POST /api/articles` - Create new article
- `GET /api/articles/[slug]` - Get article by slug
- `PUT /api/articles/[slug]` - Update article
- `DELETE /api/articles/[slug]` - Delete article
- `GET /api/articles/[slug]/versions` - Get version history
- `POST /api/articles/[slug]/versions` - Create new version
- `GET /api/articles/[slug]/versions/[versionId]` - Get specific version
- `GET /api/articles/[slug]/thread` - Get article discussion thread
- `POST /api/articles/[slug]/thread` - Create discussion thread

### Voting
- `POST /api/votes` - Cast a vote
- `GET /api/votes/[versionId]` - Get votes for version
- `POST /api/votes/[versionId]/approve` - Approve vote action

### Moderation
- `GET /api/moderation` - List items pending moderation
- `GET /api/moderation/[versionId]` - Get moderation status
- `POST /api/moderation/[versionId]/vote` - Cast moderation vote
- `POST /api/moderation/[versionId]/action` - Take moderation action
- `POST /api/moderation/[versionId]/force-approve` - Force approve
- `POST /api/moderation/[versionId]/reject` - Reject version
- `GET /api/moderation/actions` - Get moderation action history

### Threads & Comments
- `GET /api/threads/[threadId]` - Get thread details
- `GET /api/threads/[threadId]/comments` - Get thread comments
- `POST /api/threads/[threadId]/comments` - Create comment
- `PUT /api/threads/[threadId]/comments/[commentId]` - Update comment
- `DELETE /api/threads/[threadId]/comments/[commentId]` - Delete comment

### Admin
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/[userId]` - Get user details
- `PUT /api/admin/users/[userId]` - Update user
- `PUT /api/admin/users/[userId]/role` - Change user role
- `POST /api/admin/users/[userId]/badges` - Award badge to user
- `GET /api/admin/badges` - List all badges
- `POST /api/admin/badges` - Create new badge
- `POST /api/admin/badges/award` - Award badge
- `GET /api/admin/logs` - Get system logs
- `GET /api/admin/stats` - Get platform statistics

## Article Categories

- **FOUNDATIONS** - Core ML/AI concepts and fundamentals
- **SYSTEMS** - Infrastructure, architecture, and scalability
- **APPLIED** - Practical applications and implementations
- **MLOPS** - ML operations, deployment, and monitoring
- **SAFETY** - AI safety, alignment, and ethics
- **BENCHMARKS** - Evaluation, testing, and benchmarking
- **CASE_STUDIES** - Real-world examples and lessons learned
- **CAREER** - Career development and industry insights

## Contributing

We welcome contributions! Here's how you can help:

### Content Contributions
1. Sign up and build reputation to become a CONTRIBUTOR
2. Create well-researched, accurate articles
3. Participate in discussions and provide constructive feedback
4. Help review articles pending approval

### Code Contributions
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Guidelines
- Follow the existing code style and conventions
- Write clear commit messages
- Add tests for new features when applicable
- Update documentation as needed
- Be respectful and constructive in discussions

## Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint

# Database
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema changes
npx prisma migrate dev  # Run migrations
npx prisma studio    # Open Prisma Studio GUI
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_URL` | Yes | Application URL (e.g., http://localhost:3000) |
| `NEXTAUTH_SECRET` | Yes | Secret for encrypting sessions |
| `GITHUB_ID` | No | GitHub OAuth client ID |
| `GITHUB_SECRET` | No | GitHub OAuth client secret |
| `MAINTAINER_EMAILS` | No | Comma-separated list of admin emails |

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Authentication by [NextAuth.js](https://next-auth.js.org/)
- Database ORM by [Prisma](https://www.prisma.io/)

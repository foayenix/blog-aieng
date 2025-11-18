import { PrismaClient, Role, ArticleStatus, ArticleCategory } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/**
 * Comprehensive seed script for AI Engineering Commons
 * Uses upsert for idempotent seeding
 */
export async function main() {
  console.log('Starting database seed...')

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 10)

  // ============================================
  // SEED USERS
  // ============================================
  console.log('Creating users...')

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@aieng.commons' },
    update: {},
    create: {
      email: 'admin@aieng.commons',
      name: 'Admin Maintainer',
      password: hashedPassword,
      role: Role.MAINTAINER,
      reputation: 500,
      bio: 'Platform maintainer and administrator for AI Engineering Commons.',
    },
  })

  const judgeUser = await prisma.user.upsert({
    where: { email: 'sarah@aieng.commons' },
    update: {},
    create: {
      email: 'sarah@aieng.commons',
      name: 'Sarah Judge',
      password: hashedPassword,
      role: Role.JUDGE,
      reputation: 250,
      bio: 'Senior AI engineer with expertise in LLM evaluation and benchmarking.',
    },
  })

  const reviewerUser = await prisma.user.upsert({
    where: { email: 'mike@aieng.commons' },
    update: {},
    create: {
      email: 'mike@aieng.commons',
      name: 'Mike Reviewer',
      password: hashedPassword,
      role: Role.REVIEWER,
      reputation: 100,
      bio: 'ML engineer specializing in production systems and MLOps.',
    },
  })

  const contributorUser = await prisma.user.upsert({
    where: { email: 'alice@aieng.commons' },
    update: {},
    create: {
      email: 'alice@aieng.commons',
      name: 'Alice Contributor',
      password: hashedPassword,
      role: Role.CONTRIBUTOR,
      reputation: 30,
      bio: 'Data scientist exploring AI applications in healthcare.',
    },
  })

  const readerUser = await prisma.user.upsert({
    where: { email: 'bob@aieng.commons' },
    update: {},
    create: {
      email: 'bob@aieng.commons',
      name: 'Bob Reader',
      password: hashedPassword,
      role: Role.READER,
      reputation: 5,
      bio: 'AI enthusiast learning about machine learning engineering.',
    },
  })

  console.log('Users created successfully')

  // ============================================
  // SEED BADGES
  // ============================================
  console.log('Creating badges...')

  const badges = [
    {
      slug: 'first-merge',
      label: 'First Merge',
      description: 'Merged your first article',
      icon: 'git-merge',
    },
    {
      slug: 'ten-articles',
      label: 'Prolific Writer',
      description: 'Merged 10 articles',
      icon: 'edit-3',
    },
    {
      slug: 'judge-panel',
      label: 'Elite Judge',
      description: 'Promoted to the Judge panel',
      icon: 'award',
    },
    {
      slug: 'benchmark-builder',
      label: 'Benchmark Builder',
      description: 'Created a benchmarks article',
      icon: 'bar-chart-2',
    },
    {
      slug: 'case-study-author',
      label: 'Case Study Author',
      description: 'Published a case study',
      icon: 'file-text',
    },
    {
      slug: 'helpful-reviewer',
      label: 'Helpful Reviewer',
      description: 'Cast 50 helpful votes',
      icon: 'thumbs-up',
    },
  ]

  const createdBadges: Record<string, { id: string }> = {}

  for (const badge of badges) {
    const created = await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: {},
      create: badge,
    })
    createdBadges[badge.slug] = created
  }

  console.log('Badges created successfully')

  // ============================================
  // SEED ARTICLES
  // ============================================
  console.log('Creating articles...')

  // Article 1: PUBLISHED - Foundations
  const article1 = await prisma.article.upsert({
    where: { slug: 'understanding-transformer-architecture' },
    update: {},
    create: {
      slug: 'understanding-transformer-architecture',
      title: 'Understanding Transformer Architecture',
      summary: 'A comprehensive guide to the transformer architecture that powers modern LLMs, including attention mechanisms and positional encoding.',
      status: ArticleStatus.PUBLISHED,
      category: ArticleCategory.FOUNDATIONS,
      tags: ['transformers', 'attention', 'nlp', 'deep-learning'],
      authorId: adminUser.id,
    },
  })

  const version1 = await prisma.articleVersion.upsert({
    where: {
      articleId_versionNumber: {
        articleId: article1.id,
        versionNumber: 1,
      },
    },
    update: {},
    create: {
      articleId: article1.id,
      versionNumber: 1,
      createdById: adminUser.id,
      bodyMdx: `# Understanding Transformer Architecture

The transformer architecture revolutionized natural language processing when it was introduced in the seminal paper "Attention Is All You Need" by Vaswani et al. in 2017. This architecture forms the foundation of modern large language models like GPT-4, Claude, and LLaMA.

## Self-Attention Mechanism

At the heart of the transformer is the self-attention mechanism, which allows the model to weigh the importance of different parts of the input when producing each part of the output.

\`\`\`python
import torch
import torch.nn.functional as F

def scaled_dot_product_attention(query, key, value, mask=None):
    """
    Compute scaled dot-product attention.

    Args:
        query: Query tensor of shape (batch, heads, seq_len, d_k)
        key: Key tensor of shape (batch, heads, seq_len, d_k)
        value: Value tensor of shape (batch, heads, seq_len, d_v)
        mask: Optional mask tensor

    Returns:
        Attention output and attention weights
    """
    d_k = query.size(-1)
    scores = torch.matmul(query, key.transpose(-2, -1)) / math.sqrt(d_k)

    if mask is not None:
        scores = scores.masked_fill(mask == 0, -1e9)

    attention_weights = F.softmax(scores, dim=-1)
    output = torch.matmul(attention_weights, value)

    return output, attention_weights
\`\`\`

## Multi-Head Attention

Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions. This is particularly powerful for capturing various types of relationships in the data.

The key insight is that different attention heads can learn to focus on different aspects of the input - some might capture syntactic relationships, while others focus on semantic similarity or positional patterns.
`,
      changelog: 'Initial version of the transformer architecture guide',
    },
  })

  // Update article with current version
  await prisma.article.update({
    where: { id: article1.id },
    data: { currentVersionId: version1.id },
  })

  // Article 2: PUBLISHED - MLOps
  const article2 = await prisma.article.upsert({
    where: { slug: 'ml-model-deployment-best-practices' },
    update: {},
    create: {
      slug: 'ml-model-deployment-best-practices',
      title: 'ML Model Deployment Best Practices',
      summary: 'Essential patterns and practices for deploying machine learning models to production, including containerization, monitoring, and scaling strategies.',
      status: ArticleStatus.PUBLISHED,
      category: ArticleCategory.MLOPS,
      tags: ['deployment', 'docker', 'kubernetes', 'monitoring', 'production'],
      authorId: reviewerUser.id,
    },
  })

  const version2 = await prisma.articleVersion.upsert({
    where: {
      articleId_versionNumber: {
        articleId: article2.id,
        versionNumber: 1,
      },
    },
    update: {},
    create: {
      articleId: article2.id,
      versionNumber: 1,
      createdById: reviewerUser.id,
      bodyMdx: `# ML Model Deployment Best Practices

Deploying machine learning models to production requires careful consideration of performance, reliability, and maintainability. This guide covers essential patterns that every ML engineer should know.

## Containerization with Docker

Containerizing your ML models ensures consistent environments across development and production. Here's a production-ready Dockerfile for a PyTorch model:

\`\`\`dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    libgomp1 \\
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy model and application code
COPY model/ ./model/
COPY app.py .

# Create non-root user for security
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
\`\`\`

## Model Serving with FastAPI

FastAPI provides excellent performance for model serving with automatic OpenAPI documentation:

\`\`\`python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch

app = FastAPI(title="ML Model API")

class PredictionRequest(BaseModel):
    text: str

class PredictionResponse(BaseModel):
    prediction: str
    confidence: float

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    try:
        result = model.predict(request.text)
        return PredictionResponse(
            prediction=result["label"],
            confidence=result["score"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
\`\`\`

## Monitoring and Observability

Production ML systems require comprehensive monitoring. Track model performance metrics, latency, and data drift to catch issues early.
`,
      changelog: 'Initial deployment guide',
    },
  })

  await prisma.article.update({
    where: { id: article2.id },
    data: { currentVersionId: version2.id },
  })

  // Article 3: UNDER_REVIEW - Benchmarks
  const article3 = await prisma.article.upsert({
    where: { slug: 'llm-evaluation-benchmarks-2024' },
    update: {},
    create: {
      slug: 'llm-evaluation-benchmarks-2024',
      title: 'LLM Evaluation Benchmarks in 2024',
      summary: 'A comprehensive overview of modern LLM evaluation benchmarks, including MMLU, HellaSwag, and emerging domain-specific evaluations.',
      status: ArticleStatus.UNDER_REVIEW,
      category: ArticleCategory.BENCHMARKS,
      tags: ['benchmarks', 'evaluation', 'llm', 'mmlu', 'testing'],
      authorId: contributorUser.id,
    },
  })

  const version3 = await prisma.articleVersion.upsert({
    where: {
      articleId_versionNumber: {
        articleId: article3.id,
        versionNumber: 1,
      },
    },
    update: {},
    create: {
      articleId: article3.id,
      versionNumber: 1,
      createdById: contributorUser.id,
      bodyMdx: `# LLM Evaluation Benchmarks in 2024

Evaluating large language models requires comprehensive benchmarks that test various capabilities. This article surveys the most important benchmarks used today and emerging evaluation methods.

## MMLU (Massive Multitask Language Understanding)

MMLU tests models across 57 subjects ranging from elementary mathematics to professional law. It's become a standard benchmark for measuring general knowledge and reasoning.

\`\`\`python
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer

def evaluate_mmlu(model_name: str, num_samples: int = 100):
    """
    Evaluate a model on MMLU benchmark.

    Args:
        model_name: HuggingFace model identifier
        num_samples: Number of samples to evaluate

    Returns:
        Accuracy score across subjects
    """
    dataset = load_dataset("cais/mmlu", "all")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(model_name)

    correct = 0
    total = 0

    for sample in dataset["test"].select(range(num_samples)):
        prompt = format_mmlu_prompt(sample)
        prediction = generate_answer(model, tokenizer, prompt)

        if prediction == sample["answer"]:
            correct += 1
        total += 1

    return correct / total
\`\`\`

## Beyond Multiple Choice

While multiple-choice benchmarks like MMLU are useful, they don't capture the full range of LLM capabilities. Newer benchmarks focus on:

- **Open-ended generation quality**: Measuring coherence, factuality, and helpfulness
- **Tool use and agentic behavior**: Evaluating multi-step reasoning and API usage
- **Safety and alignment**: Testing for harmful outputs and instruction following

The field is moving toward more holistic evaluations that better predict real-world performance.
`,
      changelog: 'Initial benchmarks overview',
    },
  })

  // Article 4: UNDER_REVIEW - Case Studies
  const article4 = await prisma.article.upsert({
    where: { slug: 'building-rag-system-healthcare' },
    update: {},
    create: {
      slug: 'building-rag-system-healthcare',
      title: 'Building a RAG System for Healthcare',
      summary: 'A detailed case study of implementing retrieval-augmented generation for medical question answering with compliance considerations.',
      status: ArticleStatus.UNDER_REVIEW,
      category: ArticleCategory.CASE_STUDIES,
      tags: ['rag', 'healthcare', 'case-study', 'compliance', 'embeddings'],
      authorId: judgeUser.id,
    },
  })

  const version4 = await prisma.articleVersion.upsert({
    where: {
      articleId_versionNumber: {
        articleId: article4.id,
        versionNumber: 1,
      },
    },
    update: {},
    create: {
      articleId: article4.id,
      versionNumber: 1,
      createdById: judgeUser.id,
      bodyMdx: `# Building a RAG System for Healthcare

This case study documents our experience building a retrieval-augmented generation (RAG) system for medical question answering. We'll cover architecture decisions, compliance requirements, and lessons learned.

## System Architecture

Our healthcare RAG system consists of three main components: a document ingestion pipeline, a vector store for retrieval, and an LLM for generation. Here's the core retrieval logic:

\`\`\`python
from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings
from langchain.chains import RetrievalQA

class HealthcareRAG:
    def __init__(self, persist_directory: str):
        self.embeddings = OpenAIEmbeddings()
        self.vectorstore = Chroma(
            persist_directory=persist_directory,
            embedding_function=self.embeddings
        )
        self.retriever = self.vectorstore.as_retriever(
            search_type="similarity_score_threshold",
            search_kwargs={"score_threshold": 0.7, "k": 5}
        )

    def query(self, question: str) -> dict:
        """
        Query the RAG system with compliance logging.

        Args:
            question: User's medical question

        Returns:
            Answer with source citations
        """
        docs = self.retriever.get_relevant_documents(question)

        # Log retrieval for compliance audit
        self.log_retrieval(question, docs)

        answer = self.generate_answer(question, docs)

        return {
            "answer": answer,
            "sources": [doc.metadata for doc in docs],
            "confidence": self.calculate_confidence(docs)
        }
\`\`\`

## HIPAA Compliance Considerations

Working with healthcare data requires strict adherence to HIPAA regulations. Key considerations include:

- **Data encryption**: All PHI must be encrypted at rest and in transit
- **Access controls**: Role-based access with comprehensive audit logging
- **De-identification**: Removing or masking patient identifiers in training data

We implemented a comprehensive audit trail that logs every query and retrieval operation, enabling compliance reviews and incident investigation.

## Results and Lessons Learned

After six months in production, our system achieved 94% accuracy on medical QA benchmarks while maintaining full HIPAA compliance. Key lessons:

1. Domain-specific embeddings significantly improve retrieval quality
2. Confidence thresholds are essential for safety-critical applications
3. Regular reindexing keeps the knowledge base current
`,
      changelog: 'Initial case study draft',
    },
  })

  // Article 5: PUBLISHED - Safety
  const article5 = await prisma.article.upsert({
    where: { slug: 'prompt-injection-defense-strategies' },
    update: {},
    create: {
      slug: 'prompt-injection-defense-strategies',
      title: 'Prompt Injection Defense Strategies',
      summary: 'Comprehensive strategies for defending against prompt injection attacks in LLM applications, with practical examples and detection methods.',
      status: ArticleStatus.PUBLISHED,
      category: ArticleCategory.SAFETY,
      tags: ['security', 'prompt-injection', 'safety', 'defense', 'llm'],
      authorId: judgeUser.id,
    },
  })

  const version5 = await prisma.articleVersion.upsert({
    where: {
      articleId_versionNumber: {
        articleId: article5.id,
        versionNumber: 1,
      },
    },
    update: {},
    create: {
      articleId: article5.id,
      versionNumber: 1,
      createdById: judgeUser.id,
      bodyMdx: `# Prompt Injection Defense Strategies

Prompt injection attacks attempt to manipulate LLM behavior by injecting malicious instructions. This article covers defense strategies every AI engineer should implement.

## Understanding the Threat

Prompt injection occurs when user input contains instructions that override or modify the system prompt. This can lead to data leakage, unauthorized actions, or harmful outputs.

## Defense in Depth

Effective defense requires multiple layers of protection:

\`\`\`python
import re
from typing import Optional

class PromptDefense:
    def __init__(self):
        self.suspicious_patterns = [
            r"ignore (?:previous|above|all) instructions",
            r"you are now",
            r"new instructions:",
            r"system prompt:",
        ]

    def sanitize_input(self, user_input: str) -> str:
        """
        Sanitize user input to prevent injection.

        Args:
            user_input: Raw user input

        Returns:
            Sanitized input string
        """
        # Remove potential control characters
        sanitized = re.sub(r'[\\x00-\\x1f\\x7f-\\x9f]', '', user_input)

        # Escape special delimiters
        sanitized = sanitized.replace('"""', '\\"\\"\\"')

        return sanitized

    def detect_injection(self, text: str) -> Optional[str]:
        """
        Detect potential injection attempts.

        Args:
            text: Text to analyze

        Returns:
            Matched pattern if detected, None otherwise
        """
        text_lower = text.lower()
        for pattern in self.suspicious_patterns:
            if re.search(pattern, text_lower):
                return pattern
        return None
\`\`\`

## Output Validation

Always validate LLM outputs before acting on them. This is especially important for agentic systems that can perform actions.
`,
      changelog: 'Initial security guide',
    },
  })

  await prisma.article.update({
    where: { id: article5.id },
    data: { currentVersionId: version5.id },
  })

  // Article 6: DRAFT - Systems
  const article6 = await prisma.article.upsert({
    where: { slug: 'vector-database-comparison' },
    update: {},
    create: {
      slug: 'vector-database-comparison',
      title: 'Vector Database Comparison Guide',
      summary: 'Comparing popular vector databases for AI applications: Pinecone, Weaviate, Milvus, and Chroma.',
      status: ArticleStatus.DRAFT,
      category: ArticleCategory.SYSTEMS,
      tags: ['vector-db', 'embeddings', 'infrastructure', 'comparison'],
      authorId: contributorUser.id,
    },
  })

  await prisma.articleVersion.upsert({
    where: {
      articleId_versionNumber: {
        articleId: article6.id,
        versionNumber: 1,
      },
    },
    update: {},
    create: {
      articleId: article6.id,
      versionNumber: 1,
      createdById: contributorUser.id,
      bodyMdx: `# Vector Database Comparison Guide

Work in progress - comparing vector databases for AI applications.

## Databases Under Review

- Pinecone
- Weaviate
- Milvus
- Chroma

More content coming soon...
`,
      changelog: 'Initial draft',
    },
  })

  // Article 7: PUBLISHED - Applied
  const article7 = await prisma.article.upsert({
    where: { slug: 'fine-tuning-llms-custom-domains' },
    update: {},
    create: {
      slug: 'fine-tuning-llms-custom-domains',
      title: 'Fine-tuning LLMs for Custom Domains',
      summary: 'A practical guide to fine-tuning large language models for domain-specific applications using LoRA and QLoRA techniques.',
      status: ArticleStatus.PUBLISHED,
      category: ArticleCategory.APPLIED,
      tags: ['fine-tuning', 'lora', 'qlora', 'customization', 'training'],
      authorId: adminUser.id,
    },
  })

  const version7 = await prisma.articleVersion.upsert({
    where: {
      articleId_versionNumber: {
        articleId: article7.id,
        versionNumber: 1,
      },
    },
    update: {},
    create: {
      articleId: article7.id,
      versionNumber: 1,
      createdById: adminUser.id,
      bodyMdx: `# Fine-tuning LLMs for Custom Domains

Fine-tuning allows you to adapt pre-trained LLMs to specific domains or tasks. This guide covers modern techniques like LoRA that make fine-tuning accessible.

## Why Fine-tune?

While large foundation models are capable out of the box, fine-tuning offers:

- Better performance on domain-specific tasks
- Reduced latency (smaller specialized models)
- Lower inference costs
- Custom behavior and formatting

## LoRA: Low-Rank Adaptation

LoRA freezes the pre-trained model weights and injects trainable rank decomposition matrices. This dramatically reduces trainable parameters:

\`\`\`python
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM

def setup_lora_model(base_model_name: str, r: int = 8, alpha: int = 32):
    """
    Configure a model for LoRA fine-tuning.

    Args:
        base_model_name: HuggingFace model identifier
        r: LoRA rank (lower = fewer parameters)
        alpha: LoRA alpha for scaling

    Returns:
        PEFT model ready for training
    """
    model = AutoModelForCausalLM.from_pretrained(
        base_model_name,
        torch_dtype=torch.bfloat16,
        device_map="auto"
    )

    lora_config = LoraConfig(
        r=r,
        lora_alpha=alpha,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM"
    )

    peft_model = get_peft_model(model, lora_config)
    peft_model.print_trainable_parameters()

    return peft_model
\`\`\`

## Training Tips

For successful fine-tuning:

1. Curate high-quality training data specific to your domain
2. Use a validation set to monitor for overfitting
3. Start with small rank values and increase if needed
4. Monitor loss curves for training stability
`,
      changelog: 'Initial fine-tuning guide',
    },
  })

  await prisma.article.update({
    where: { id: article7.id },
    data: { currentVersionId: version7.id },
  })

  // Article 8: UNDER_REVIEW - Career
  const article8 = await prisma.article.upsert({
    where: { slug: 'ai-engineer-career-path' },
    update: {},
    create: {
      slug: 'ai-engineer-career-path',
      title: 'AI Engineer Career Path Guide',
      summary: 'A comprehensive guide to building a career as an AI engineer, covering skills, roles, and growth opportunities.',
      status: ArticleStatus.UNDER_REVIEW,
      category: ArticleCategory.CAREER,
      tags: ['career', 'skills', 'growth', 'roles', 'learning'],
      authorId: reviewerUser.id,
    },
  })

  const version8 = await prisma.articleVersion.upsert({
    where: {
      articleId_versionNumber: {
        articleId: article8.id,
        versionNumber: 1,
      },
    },
    update: {},
    create: {
      articleId: article8.id,
      versionNumber: 1,
      createdById: reviewerUser.id,
      bodyMdx: `# AI Engineer Career Path Guide

The role of AI Engineer has emerged as one of the most in-demand positions in tech. This guide helps you navigate the career path.

## Core Skills

AI Engineers bridge the gap between research and production. Essential skills include:

**Technical Skills:**
- Python and ML frameworks (PyTorch, TensorFlow)
- LLM APIs and prompt engineering
- Vector databases and RAG systems
- MLOps and deployment

**Soft Skills:**
- Communication with non-technical stakeholders
- Product thinking and user empathy
- Rapid prototyping and iteration

## Career Progression

\`\`\`
Junior AI Engineer
       |
  AI Engineer
       |
 Senior AI Engineer
       |
Staff AI Engineer / AI Engineering Manager
\`\`\`

Each level requires deeper technical expertise plus increasing scope of impact and leadership.

## Building Your Portfolio

Demonstrate your skills through:
- Open source contributions
- Technical blog posts
- Side projects with real users
- Conference talks or workshops
`,
      changelog: 'Initial career guide',
    },
  })

  console.log('Articles created successfully')

  // ============================================
  // SEED THREADS FOR ARTICLES
  // ============================================
  console.log('Creating threads...')

  const threads = [
    { articleId: article1.id, createdById: adminUser.id },
    { articleId: article2.id, createdById: reviewerUser.id },
    { articleId: article3.id, createdById: contributorUser.id },
    { articleId: article4.id, createdById: judgeUser.id },
    { articleId: article5.id, createdById: judgeUser.id },
    { articleId: article6.id, createdById: contributorUser.id },
    { articleId: article7.id, createdById: adminUser.id },
    { articleId: article8.id, createdById: reviewerUser.id },
  ]

  const createdThreads: Record<string, { id: string }> = {}

  for (const thread of threads) {
    const created = await prisma.thread.upsert({
      where: { articleId: thread.articleId },
      update: {},
      create: thread,
    })
    createdThreads[thread.articleId] = created
  }

  console.log('Threads created successfully')

  // ============================================
  // SEED VOTES ON UNDER_REVIEW ARTICLES
  // ============================================
  console.log('Creating votes...')

  // Votes on article 3 (LLM benchmarks - UNDER_REVIEW)
  const votes3 = [
    { articleVersionId: version3.id, userId: judgeUser.id, value: 1 },
    { articleVersionId: version3.id, userId: reviewerUser.id, value: 1 },
    { articleVersionId: version3.id, userId: adminUser.id, value: 1 },
  ]

  for (const vote of votes3) {
    await prisma.vote.upsert({
      where: {
        articleVersionId_userId: {
          articleVersionId: vote.articleVersionId,
          userId: vote.userId,
        },
      },
      update: {},
      create: vote,
    })
  }

  // Votes on article 4 (Healthcare RAG - UNDER_REVIEW)
  const votes4 = [
    { articleVersionId: version4.id, userId: adminUser.id, value: 1 },
    { articleVersionId: version4.id, userId: reviewerUser.id, value: 1 },
    { articleVersionId: version4.id, userId: contributorUser.id, value: 1 },
    { articleVersionId: version4.id, userId: readerUser.id, value: -1 },
  ]

  for (const vote of votes4) {
    await prisma.vote.upsert({
      where: {
        articleVersionId_userId: {
          articleVersionId: vote.articleVersionId,
          userId: vote.userId,
        },
      },
      update: {},
      create: vote,
    })
  }

  // Votes on article 8 (Career guide - UNDER_REVIEW)
  const votes8 = [
    { articleVersionId: version8.id, userId: judgeUser.id, value: 1 },
    { articleVersionId: version8.id, userId: contributorUser.id, value: 1 },
  ]

  for (const vote of votes8) {
    await prisma.vote.upsert({
      where: {
        articleVersionId_userId: {
          articleVersionId: vote.articleVersionId,
          userId: vote.userId,
        },
      },
      update: {},
      create: vote,
    })
  }

  console.log('Votes created successfully')

  // ============================================
  // SEED COMMENTS ON THREADS
  // ============================================
  console.log('Creating comments...')

  // Comments on article 3 thread (LLM benchmarks)
  const thread3 = createdThreads[article3.id]

  const comment1 = await prisma.threadComment.create({
    data: {
      threadId: thread3.id,
      userId: judgeUser.id,
      body: 'Great overview of benchmarks! I would suggest adding a section about HumanEval and code generation benchmarks as well.',
    },
  })

  await prisma.threadComment.create({
    data: {
      threadId: thread3.id,
      userId: contributorUser.id,
      body: 'Thanks for the feedback! I\'ll add a section on code generation benchmarks in the next revision.',
      parentCommentId: comment1.id,
    },
  })

  await prisma.threadComment.create({
    data: {
      threadId: thread3.id,
      userId: reviewerUser.id,
      body: 'The MMLU example code is very helpful. Consider adding error handling for API rate limits.',
    },
  })

  // Comments on article 4 thread (Healthcare RAG)
  const thread4 = createdThreads[article4.id]

  const comment4 = await prisma.threadComment.create({
    data: {
      threadId: thread4.id,
      userId: adminUser.id,
      body: 'Excellent case study! The HIPAA compliance section is particularly valuable. Could you expand on the audit logging implementation?',
    },
  })

  await prisma.threadComment.create({
    data: {
      threadId: thread4.id,
      userId: judgeUser.id,
      body: 'Good point about audit logging. I\'ll add more details about our logging schema and retention policies.',
      parentCommentId: comment4.id,
    },
  })

  // Comments on article 1 thread (Transformers - PUBLISHED)
  const thread1 = createdThreads[article1.id]

  await prisma.threadComment.create({
    data: {
      threadId: thread1.id,
      userId: readerUser.id,
      body: 'This is a fantastic introduction to transformers! Really helped me understand the attention mechanism.',
    },
  })

  await prisma.threadComment.create({
    data: {
      threadId: thread1.id,
      userId: contributorUser.id,
      body: 'Would love to see a follow-up article on positional encoding variants like RoPE and ALiBi.',
    },
  })

  console.log('Comments created successfully')

  // ============================================
  // AWARD BADGES TO USERS
  // ============================================
  console.log('Awarding badges...')

  const badgeAwards = [
    // Admin has first merge and is prolific
    { userId: adminUser.id, badgeId: createdBadges['first-merge'].id },
    { userId: adminUser.id, badgeId: createdBadges['ten-articles'].id },

    // Sarah is a judge and has done benchmarks
    { userId: judgeUser.id, badgeId: createdBadges['judge-panel'].id },
    { userId: judgeUser.id, badgeId: createdBadges['case-study-author'].id },
    { userId: judgeUser.id, badgeId: createdBadges['first-merge'].id },

    // Mike is a helpful reviewer
    { userId: reviewerUser.id, badgeId: createdBadges['helpful-reviewer'].id },
    { userId: reviewerUser.id, badgeId: createdBadges['first-merge'].id },

    // Alice has her first merge
    { userId: contributorUser.id, badgeId: createdBadges['first-merge'].id },
    { userId: contributorUser.id, badgeId: createdBadges['benchmark-builder'].id },
  ]

  for (const award of badgeAwards) {
    await prisma.userBadge.upsert({
      where: {
        userId_badgeId: {
          userId: award.userId,
          badgeId: award.badgeId,
        },
      },
      update: {},
      create: {
        userId: award.userId,
        badgeId: award.badgeId,
      },
    })
  }

  console.log('Badges awarded successfully')

  // ============================================
  // SEED REPUTATION EVENTS
  // ============================================
  console.log('Creating reputation events...')

  // Add some reputation events for history
  await prisma.reputationEvent.createMany({
    data: [
      {
        userId: adminUser.id,
        type: 'ARTICLE_MERGED',
        delta: 3,
        metadata: { articleSlug: 'understanding-transformer-architecture' },
      },
      {
        userId: adminUser.id,
        type: 'SUBSTANTIAL_MERGE',
        delta: 8,
        metadata: { articleSlug: 'fine-tuning-llms-custom-domains' },
      },
      {
        userId: judgeUser.id,
        type: 'PROMOTED',
        delta: 10,
        metadata: { fromRole: 'REVIEWER', toRole: 'JUDGE' },
      },
      {
        userId: judgeUser.id,
        type: 'ARTICLE_MERGED',
        delta: 3,
        metadata: { articleSlug: 'prompt-injection-defense-strategies' },
      },
      {
        userId: reviewerUser.id,
        type: 'ARTICLE_MERGED',
        delta: 3,
        metadata: { articleSlug: 'ml-model-deployment-best-practices' },
      },
      {
        userId: reviewerUser.id,
        type: 'UPVOTE',
        delta: 1,
        metadata: { reason: 'Helpful vote on approved article' },
      },
      {
        userId: contributorUser.id,
        type: 'BADGE_EARNED',
        delta: 5,
        metadata: { badgeSlug: 'first-merge' },
      },
    ],
    skipDuplicates: true,
  })

  console.log('Reputation events created successfully')

  console.log('Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

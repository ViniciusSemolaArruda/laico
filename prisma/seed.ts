import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.product.createMany({
    data: [
      {
        name: 'Terço Cristal Rosa',
        slug: 'terco-cristal-rosa',
        description: 'Terço premium cristal rosa.',
        price: 29.9,
        image: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4',
        religion: 'Católicos e Protestantes',
        category: 'Terços',
        stock: 10,
        featured: true,
      },
      {
        name: 'Pulseira Africana',
        slug: 'pulseira-africana',
        description: 'Pulseira espiritual africana.',
        price: 39.9,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
        religion: 'Matriz Africana',
        category: 'Pulseiras',
        stock: 8,
        featured: true,
      },
    ],
  })
}

main()
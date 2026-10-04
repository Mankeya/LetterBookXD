import { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  request.log.error(error)

  if (error instanceof ZodError) {
    return reply.code(400).send({
      statusCode: 400,
      message: 'Erro de validação',
      errors: error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    })
  }

  if (error.validation) {
    return reply.code(400).send({
      statusCode: 400,
      message: 'Erro de validação',
      errors: error.validation,
    })
  }

  if (error.statusCode === 401) {
    return reply.code(401).send({
      statusCode: 401,
      message: 'Não autorizado',
    })
  }

  if (error.statusCode === 403) {
    return reply.code(403).send({
      statusCode: 403,
      message: 'Acesso negado',
    })
  }

  if (error.statusCode === 404) {
    return reply.code(404).send({
      statusCode: 404,
      message: 'Recurso não encontrado',
    })
  }

  if (error.statusCode === 429) {
    return reply.code(429).send({
      statusCode: 429,
      message: 'Muitas requisições, tente novamente mais tarde',
    })
  }

  return reply.code(500).send({
    statusCode: 500,
    message: 'Erro interno do servidor',
  })
}
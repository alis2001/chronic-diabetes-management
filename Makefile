.PHONY: help build up down logs clean restart status

help:
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@echo '  build    Build all Docker images'
	@echo '  up       Start all services'
	@echo '  down     Stop all services'  
	@echo '  logs     View logs for all services'
	@echo '  clean    Clean up all resources'
	@echo '  restart  Restart all services'
	@echo '  status   Show service status'

build:
	docker-compose -f docker-compose.dev.yml build

up:  
	docker-compose -f docker-compose.dev.yml up -d

down:
	docker-compose -f docker-compose.dev.yml down

logs:
	docker-compose -f docker-compose.dev.yml logs -f

clean:
	docker-compose -f docker-compose.dev.yml down -v
	docker system prune -f

restart: down up

status:
	docker-compose -f docker-compose.dev.yml ps

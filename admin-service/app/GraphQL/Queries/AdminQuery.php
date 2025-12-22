<?php

namespace App\GraphQL\Queries;

use Nuwave\Lighthouse\Support\Contracts\GraphQLContext;

class AdminQuery
{
    public function me($_, array $args, GraphQLContext $context)
    {
        return $context->user();
    }
}



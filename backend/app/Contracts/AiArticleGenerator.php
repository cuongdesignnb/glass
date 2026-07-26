<?php

namespace App\Contracts;

use App\Models\AiContentQueue;

interface AiArticleGenerator
{
    /**
     * Generate the normalized article payload for one claimed queue item.
     *
     * @return array<string, mixed>
     */
    public function generate(AiContentQueue $item): array;
}
